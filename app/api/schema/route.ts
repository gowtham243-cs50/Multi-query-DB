import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";
import { decrypt } from "@/app/lib/crypto";
import { createConnection, type RowDataPacket } from "mysql2/promise"; // Added import

// FIX: Use a singleton pattern for PrismaClient to prevent connection/statement errors during hot-reload
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const connectionId = request.nextUrl.searchParams.get("connectionId");
    if (!connectionId) {
      return new Response(JSON.stringify({ error: "connectionId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
    if (!sessionUserId) {
      return Response.json(
        { ok: false, message: "No session" },
        { status: 401 }
      );
    }

    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (connection.userId !== sessionUserId) {
      return Response.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const password = decrypt(connection.encryptedPassword);

    const db = await createConnection({
      host: connection.host,
      port: connection.port,
      user: connection.username,
      password: password,
      database: connection.name,
    });

    type ColumnRow = RowDataPacket & {
      TABLE_NAME: string;
      COLUMN_NAME: string;
      COLUMN_TYPE: string;
      COLUMN_KEY?: string;
    };
    type PrimaryRow = RowDataPacket & {
      TABLE_NAME: string;
      COLUMN_NAME: string;
    };

    const [rows] = await db.execute<ColumnRow[]>(
      `SELECT
  TABLE_NAME,
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  ORDINAL_POSITION
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = ?
ORDER BY TABLE_NAME, ORDINAL_POSITION;`,
      [connection.name]
    );
    console.log(rows);
    const [primaryRows] = await db.execute<PrimaryRow[]>(
      `
      SELECT
  TABLE_NAME,
  COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = ?
  AND CONSTRAINT_NAME = 'PRIMARY';
      `,
      [connection.name]
    );
    console.log(primaryRows)
    const schemaMap: Record<string, { columns: { name: string; type: string; isPrimaryKey: boolean }[] }> = {};

    rows.forEach((row) => {
      const tableName = row.TABLE_NAME;
      if (
        primaryRows.some(
          (pr) => pr.TABLE_NAME === tableName && pr.COLUMN_NAME === row.COLUMN_NAME
        )
      ) {
        row.COLUMN_KEY = "PRI";
      }
      if (!schemaMap[tableName]) {
        schemaMap[tableName] = { columns: [] };
      }

      schemaMap[tableName].columns.push({
        name: row.COLUMN_NAME,
        type: row.COLUMN_TYPE,
        isPrimaryKey: row.COLUMN_KEY === "PRI", // Requires COLUMN_KEY selection
      });
    });

    const response = {
      schema: {
        default: schemaMap,
      },
    };

    console.log(JSON.stringify(schemaMap, null, 2));

    await db.end();

    // handle connectionId...
    // FIX: Return the actual schema response object instead of just connectionId
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
