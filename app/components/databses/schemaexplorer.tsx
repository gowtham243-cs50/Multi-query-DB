"use client"; // Required for hooks

import { useEffect, useState } from "react";
import { ChevronRight, ChevronDown, Database, Table as TableIcon, Columns, Key } from "lucide-react";

export default function SchemaExplorer({
    connectionId,
}: {
    connectionId: string;
}) {
    console.log("SchemaExplorer Rendered with ID:", connectionId);

    const [schema, setSchema] = useState<Record<string, any[] | any> | null>(null);
    const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (schema){
            console.log("✅ State successfully updated. Schema is now:", schema);
        }
    }, [schema]);


    useEffect(() => {
        console.log("useEffect running. ConnectionId is:", connectionId);
        // Fetch new data whenever connectionId changes
        async function fetchData() {
            setSchema(null); // Reset schema while loading
            try {
                const res = await fetch(
                    `/api/schema?connectionId=${encodeURIComponent(connectionId)}`
                );
                if (!res.ok) throw new Error(`HTTP error ${res.status}`);
                const data = await res.json();

                // FIX: Unwrap the nested structure from { schema: { default: { ... } } }
                let finalSchema = data;
                if (data.schema && data.schema.default) {
                    finalSchema = data.schema.default;
                } else if (data.schema) {
                    finalSchema = data.schema;
                }

                setSchema(finalSchema);
                console.log("Data processed for UI:", finalSchema);
            } catch (err) {
                console.error("Failed to fetch schema:", err);
                setSchema(null);
            }
            console.log("Fetching schema for:", connectionId);
        }
        if (connectionId) {
            fetchData();
        }
    }, [connectionId]);

    const toggleTable = (tableName: string) => {
        setExpandedTables(prev => ({
            ...prev,
            [tableName]: !prev[tableName]
        }));
    };

    // const handleDragstart = (e:React.DragEvent<HTMLDivElement>) =>{
    //     console.log("Drag started");
    //     e.dataTransfer.setData()

    // }

    return (
        <div className="h-full border-r border-zinc-200 bg-zinc-50 flex flex-col w-64">
            <div className="p-4 border-b border-zinc-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-zinc-500" />
                <div className="font-semibold text-sm truncate" title={connectionId}>
                    {connectionId}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
                {schema ? (
                    <div className="space-y-1">

                        {Object.entries(schema).map(([tableName, tableData]) => {
                            // Helper to extract columns regardless of API shape
                            let columns: any[] = [];
                            if (Array.isArray(tableData)) {
                                columns = tableData;
                            } else if (tableData && typeof tableData === 'object' && Array.isArray(tableData.columns)) {
                                columns = tableData.columns;
                            }

                            return (
                                <div
                                    key={tableName}
                                    className="rounded-md"
                                    draggable={true}
                                    onDragStart={(e) => {
                                        console.log("Drag started:", tableName);
                                        e.dataTransfer.setData("text/plain", tableName);
                                        e.dataTransfer.setData(
                                            "application/json",
                                            JSON.stringify({ tableName,columns })
                                        );
                                        e.dataTransfer.effectAllowed = "copyMove";
                                    }}
                                >
                                    <button
                                        onClick={() => toggleTable(tableName)}
                                        className="flex items-center w-full p-2 text-sm text-left hover:bg-zinc-200 rounded-md transition-colors gap-2"
                                    >
                                        {expandedTables[tableName] ? (
                                            <ChevronDown className="w-3 h-3 text-zinc-500" />
                                        ) : (
                                            <ChevronRight className="w-3 h-3 text-zinc-500" />
                                        )}
                                        <TableIcon className="w-3 h-3 text-blue-500" />
                                        <span className="truncate flex-1 font-medium">{tableName}</span>
                                        <span className="text-[10px] text-zinc-400">
                                            ({columns.length})
                                        </span>
                                    </button>

                                    {expandedTables[tableName] && (
                                        <div className="ml-6 pl-2 border-l border-zinc-200 mt-1 space-y-1">
                                            {columns.length > 0 ? columns.map((col: any, idx: number) => {
                                                const colName = typeof col === 'string' ? col : col.column_name || col.name || JSON.stringify(col);
                                                const colType = typeof col === 'object' ? (col.data_type || col.type) : '';
                                                const isPk = typeof col === 'object' && (col.isPrimaryKey || col.pk);

                                                return (
                                                    <div key={idx} className="flex items-center gap-2 py-1 px-2 text-xs text-zinc-600 hover:bg-zinc-100 rounded">
                                                        {isPk ? (
                                                            <Key className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                                                        ) : (
                                                            <Columns className="w-3 h-3 opacity-50 flex-shrink-0" />
                                                        )}
                                                        <span className="truncate" title={colName}>{colName}</span>
                                                        {colType && <span className="text-zinc-400 text-[10px] ml-auto">{colType}</span>}
                                                    </div>
                                                );
                                            }) : (
                                                <div className="py-1 px-2 text-xs text-zinc-400 italic">
                                                    No columns found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {Object.keys(schema).length === 0 && (
                            <div className="p-4 text-center text-xs text-zinc-400">
                                No tables found.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4 flex flex-col items-center justify-center h-40 text-zinc-400 gap-2">
                        <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></div>
                        <div className="text-xs italic">Loading schema...</div>
                    </div>
                )}
            </div>
        </div>
    );
}