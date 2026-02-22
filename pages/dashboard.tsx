import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import "@/app/globals.css";
import SchemaExplorer from "@/app/components/databses/schemaexplorer"
import { useState } from "react"
import QueryCanvas from "@/app/components/querybuilder/canvas";
import { ReactFlowProvider } from '@xyflow/react';
import {prisma} from "@/app/lib/prisma"
type ConnectionSummary = {
    id: string;
    name: string;
    type: string;
    database: string;
    host: string;
    port: number;
};

type DashboardProps = {
    connections: ConnectionSummary[];
    isAuthenticated: boolean;
};


export const getServerSideProps: GetServerSideProps<DashboardProps> = async (
    context
) => {
    const session = (await getServerSession(
        context.req,
        context.res,
        authOptions
    )) as { user?: { id?: string } } | null;

    const sessionUserId = session?.user?.id;
    if (!sessionUserId) {
        return {
            props: {
                connections: [],
                isAuthenticated: false,
            },
        };
    }


    try {
        const connections = await prisma.connection.findMany({
            where: { userId: sessionUserId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                type: true,
                database: true,
                host: true,
                port: true,
            },
        });

        return {
            props: {
                connections,
                isAuthenticated: true,
            },
        };
    } finally {
        await prisma.$disconnect();
    }
};

export default function Dashboard({
    connections,
    isAuthenticated,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900">
            <div className="flex min-h-screen">
                <aside className="w-50 shrink-0 border-r border-zinc-200 bg-white px-6 py-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
                            Connections
                        </h2>
                    </div>
                    <div className="mt-6">
                        {!isAuthenticated ? (
                            <p className="text-sm text-zinc-500">
                                Sign in to view your connected databases.
                            </p>
                        ) : connections.length === 0 ? (
                            <p className="text-sm text-zinc-500">
                                No connections yet. Add one to get started.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {connections.map((connection) => (
                                    <li
                                        key={connection.id}
                                        className={`rounded-lg border px-4 py-3 cursor-pointer transition-colors ${selectedConnectionId === connection.id
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                                            }`}                                    >
                                        <button type="button" onClick={() => setSelectedConnectionId(connection.id)}>
                                            <div className="text-sm font-semibold text-zinc-900">
                                                {connection.name}
                                            </div>
                                            <div className="mt-1 text-xs text-zinc-500">
                                                {connection.type.toUpperCase()} • {connection.database}
                                            </div>
                                            <div className="text-xs text-zinc-400">
                                                {connection.host}:{connection.port}
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </aside>
                {selectedConnectionId && (
                    <>
                        {/* mobile backdrop */}
                        <div
                            className="fixed inset-0 bg-black/30 z-40 sm:hidden"
                            onClick={() => setSelectedConnectionId(null)}
                            aria-hidden="true"
                        />

                        <aside
                            className="fixed right-0 top-0 z-50 h-full w-full overflow-y-auto bg-white px-6 py-6 shadow-lg transition-all duration-200 ease-out sm:static sm:h-auto sm:w-72 sm:shadow-none"
                            role="dialog"
                            aria-label="Connection details"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-zinc-700">Connection</h3>
                                    <p className="mt-1 text-xs text-zinc-500">
                                        Selected: <span className="font-mono text-xs text-zinc-600">{selectedConnectionId}</span>
                                    </p>
                                </div>

                                <div className="ml-4 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedConnectionId(null)}
                                        className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                        aria-label="Close panel"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 border-t border-zinc-100 pt-4">
                                <div data-testid="filler-panel" className="rounded-lg bg-white p-0">
                                    <div className="px-2 py-3">
                                        <h4 className="text-sm font-semibold text-zinc-700">Schema explorer</h4>
                                        <p className="mt-1 text-xs text-zinc-500">Browse tables and run queries for the selected connection.</p>
                                    </div>
                                    <div className="px-2 pb-4">
                                        <SchemaExplorer connectionId={selectedConnectionId} />
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </>
                )}

                <main className="flex-1 px-8 py-10">
                    <div>
                        <ReactFlowProvider><QueryCanvas></QueryCanvas></ReactFlowProvider>
                    </div>
                </main>
            </div>
        </div>
    );
}
