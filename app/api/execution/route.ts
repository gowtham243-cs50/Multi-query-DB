import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createConnection } from "mysql2/promise";
import { decrypt } from "@/app/lib/crypto"; // Ensure you have this helper
import { ConstructionIcon } from "lucide-react";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = body.steps || [];

  const handleUniformStep = async (step: any, stepIndex: number) => {
    console.log(`Step ${stepIndex} is uniform. dbtype=${step[0]?.dbtype}`);
    console.log(JSON.stringify(step[0],null,2));
    console.log(JSON.stringify(step[1],null,2));
  };
  const handleMixedStep = async (step: any, stepIndex: number) => {
    console.log(`Step ${stepIndex} has mixed dbtypes.`);
  };

  await Promise.all(
    (Array.isArray(data) ? data : []).map(async (step: any, idx: number) => {
      if (!Array.isArray(step) || step.length === 0) {
        await handleUniformStep(step, idx);
        return;
      }
      const firstType = step[0]?.dbtype;
      const isUniform = step.every((node: any) => node?.dbtype === firstType);
      if (isUniform) {
        await handleUniformStep(step, idx);
      } else {
        await handleMixedStep(step, idx);
      }
    }),
  );

  return Response.json(
    {
      ok: true,
      message: "DONE",
    },
    { status: 200 },
  );
}
