// app/api/test-mysql-user/route.ts
import { NextRequest } from "next/server";
import mysql from "mysql2/promise";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import {encrypt} from "@/app/lib/crypto"
const prisma = new PrismaClient();
export async function POST(req: NextRequest) {

  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user){
      return Response.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
    }
    const userEmail = session.user.email
    if (!userEmail) {
      return Response.json(
        { ok: false, message: "User email missing" },
        { status: 400 }
      );
    }

    const body = await req.json();

    // If you want host/port fixed, hardcode them here
    const type = body.type as string;
    const host = body.host ?? "10.224.165.208";
    const port = body.port ?? 3306;
    const user = body.user as string;
    const password = body.password as string;
    const database = body.database as string;

    if (!user || !password || !database) {
      return Response.json(
        { ok: false, message: "Missing user/password/database" },
        { status: 400 }
      );
    }
    if (!type) {
      return Response.json(
        { ok: false, message: "Missing type (expected 'mysql')" },
        { status: 400 }
      );
    }
    if (type !== "mysql") {
      return Response.json(
        { ok: false, message: `Unsupported type: ${type}` },
        { status: 400 }
      );
    }
    if (type === "mysql"){
      try {
        const conn = await mysql.createConnection({
          host,
          port,
          user,
          password,
          database,
          connectTimeout: 3000,
        });

        
    
        const [rows] = await conn.query("SELECT 1 AS ok");
        await conn.end();

        //save to psql connection data
        const user_Data = await prisma.user.findUnique({
          where:{email:userEmail}
        })
        if (!user_Data) {
          return Response.json(
            { ok: false, message: "Authenticated user not found" },
            { status: 404 }
          );
        }
        const hased = encrypt(password)
        
        let newDB;
        try {
          newDB = await prisma.connection.create({
            data: {
              userId: user_Data.id,
              name: body.name || database, // Use provided name or fallback to database name
              type: type,
              host: host,
              port: Number(port),
              database: database,
              username: user,
              encryptedPassword: hased, // Note: You should encrypt this before saving in production
            }
          });
        } catch (dbError: unknown) {
          console.error("Failed to save connection:", dbError);
          const errorMessage =
            dbError instanceof Error ? dbError.message : "Unknown error";
          return Response.json(
            { 
              ok: false, 
              message: "Connection verified but failed to save", 
              error: errorMessage 
            },
            { status: 500 }
          );
        }

        const safeConnection = newDB
          ? (({ encryptedPassword: _encryptedPassword, ...safeDB }) => {
              void _encryptedPassword;
              return safeDB;
            })(newDB)
          : null;

        return Response.json(
          {
            ok: true,
            message: "Connection successful",
            result: rows,
            connection: safeConnection,
          },
          { status: 200 }
        );
      } catch (err: unknown) {
        const errorCode =
          err && typeof err === "object" && "code" in err
            ? String((err as { code?: unknown }).code)
            : null;
        return Response.json(
          {
            ok: false,
            message: "Connection failed",
            code: errorCode,
          },
          { status: 400 }
        );
      }

    }
  } catch {
    return Response.json(
      { ok: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }
}
