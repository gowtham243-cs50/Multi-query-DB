import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createConnection } from "mysql2/promise";
import { decrypt } from "@/app/lib/crypto"; // Ensure you have this helper

const prisma = new PrismaClient()

export async function POST(req: NextRequest){
    
    
}