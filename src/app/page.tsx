"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw } from "lucide-react";

const AceEditor = dynamic(
  async () => {
    const ace = await import("react-ace");
    await import("ace-builds/src-noconflict/mode-sql");
    await import("ace-builds/src-noconflict/theme-terminal");
    return ace;
  },
  { ssr: false }
);

interface ConversionRule {
  regex: RegExp;
  replace: string | ((match: string, ...args: string[]) => string);
}

const conversionRules: ConversionRule[] = [
  { regex: /\[([^\]]+)\]/g, replace: '"$1"' },
  { regex: /N'([^']*)'/g, replace: "'$1'" },
  { regex: /TOP\s+(\d+)/i, replace: "LIMIT $1" },
  { regex: /GETDATE\(\)/gi, replace: "CURRENT_DATE" },
  { regex: /SYSDATETIME\(\)/gi, replace: "CURRENT_TIMESTAMP" },
  {
    regex: /DATEDIFF\((\w+),\s*([^,]+),\s*([^)]+)\)/gi,
    replace: (
      match: string,
      interval: string,
      startDate: string,
      endDate: string
    ) => {
      const intervalMap: { [key: string]: string } = {
        YEAR: "YEAR",
        MONTH: "MONTH",
        DAY: "DAY",
        HOUR: "HOUR",
        MINUTE: "MINUTE",
        SECOND: "SECOND",
      };
      return `DATE_PART('${
        intervalMap[interval.toUpperCase()]
      }', ${endDate}::timestamp - ${startDate}::timestamp)`;
    },
  },
  { regex: /ISNULL\(([^,]+),\s*([^)]+)\)/gi, replace: "COALESCE($1, $2)" },
  { regex: /CONVERT\((\w+),\s*([^)]+)\)/gi, replace: "CAST($2 AS $1)" },
  { regex: /CHARINDEX\(([^,]+),\s*([^)]+)\)/gi, replace: "POSITION($1 IN $2)" },
  { regex: /LEN\(([^)]+)\)/gi, replace: "LENGTH($1)" },
  {
    regex: /GETUTCDATE\(\)/gi,
    replace: "CURRENT_TIMESTAMP AT TIME ZONE 'UTC'",
  },
  {
    regex: /DATEFROMPARTS\((\d+),\s*(\d+),\s*(\d+)\)/gi,
    replace: "MAKE_DATE($1, $2, $3)",
  },
  {
    regex: /DATEADD\((\w+),\s*([^,]+),\s*([^)]+)\)/gi,
    replace: (
      match: string,
      interval: string,
      number: string,
      date: string
    ) => {
      const intervalMap: { [key: string]: string } = {
        YEAR: "YEARS",
        MONTH: "MONTHS",
        DAY: "DAYS",
        HOUR: "HOURS",
        MINUTE: "MINUTES",
        SECOND: "SECONDS",
      };
      return `(${date}::timestamp + INTERVAL '${number} ${
        intervalMap[interval.toUpperCase()] || interval
      }')`;
    },
  },
  { regex: /(\w+)\s*\+\s*(\w+)/g, replace: "$1 || $2" },
  { regex: /SELECT\s+TOP\s+(\d+)/gi, replace: "SELECT" },
  { regex: /^\s*GO\s*$/gim, replace: ";" },
];

const processSubQueries = (sql: string): string => {
  const subQueryRegex = /\(([^()]+|\((?:[^()]+|\([^()]*\))*\))*\)/g;
  return sql.replace(subQueryRegex, (match) => {
    const innerSql = match.slice(1, -1);
    const convertedInnerSql = convertQuery(innerSql);
    return `(${convertedInnerSql})`;
  });
};

const convertQuery = (sql: string): string => {
  let converted = sql;

  // Process subqueries first
  converted = processSubQueries(converted);

  // Apply conversion rules
  conversionRules.forEach((rule) => {
    converted = converted.replace(rule.regex, rule.replace as string);
  });

  // Correct schema names
  converted = converted.replace(/(\w+)\./g, (match, schemaName) => {
    return schemaName.toLowerCase() + ".";
  });

  // Add LIMIT to the end if it's not present
  if (!/LIMIT\s+\d+/i.test(converted) && /TOP\s+\d+/i.test(sql)) {
    const match = sql.match(/TOP\s+(\d+)/i);
    if (match) {
      converted += ` LIMIT ${match[1]}`;
    }
  }

  return converted;
};

export default function SQLConverter() {
  const [mssqlQuery, setMssqlQuery] = useState<string>("");
  const [psqlQuery, setPsqlQuery] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [isConverting, setIsConverting] = useState<boolean>(false);

  useEffect(() => {
    if (mssqlQuery) {
      setIsConverting(true);
      const converted = convertQuery(mssqlQuery);
      setPsqlQuery(converted);
      setIsConverting(false);
    } else {
      setPsqlQuery("");
    }
  }, [mssqlQuery]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(psqlQuery).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
      }
    );
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Real-time SQL Query Converter</h1>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">MSSQL Query</h2>
          <AceEditor
            name="mssql-editor"
            mode="sql"
            theme="terminal"
            onChange={setMssqlQuery}
            value={mssqlQuery}
            lineHeight={19}
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
            fontSize={14}
            editorProps={{ $blockScrolling: true }}
            setOptions={{
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              enableSnippets: true,
              showLineNumbers: true,
              tabSize: 2,
            }}
            style={{ width: "100%", height: "500px" }}
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">PostgreSQL Query</h2>
            {isConverting && (
              <div className="flex items-center text-blue-500">
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                <span>Converting...</span>
              </div>
            )}
          </div>
          <AceEditor
            name="psql-editor"
            mode="sql"
            theme="terminal"
            value={psqlQuery}
            fontSize={14}
            lineHeight={19}
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
            editorProps={{ $blockScrolling: true }}
            readOnly={true}
            setOptions={{
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: false,
              enableSnippets: false,
              showLineNumbers: true,
              tabSize: 2,
            }}
            style={{ width: "100%", height: "500px" }}
          />
          <Button
            onClick={copyToClipboard}
            className="mt-2 flex items-center"
            disabled={!psqlQuery}
          >
            <Copy className="w-4 h-4 mr-2" />
            {copySuccess ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>
    </div>
  );
}
