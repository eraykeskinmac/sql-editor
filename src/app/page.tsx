"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Copy, Trash, RefreshCw } from "lucide-react";
import { useCompletion } from "ai/react";
import { toast } from "@/hooks/use-toast";

const AceEditor = dynamic(
  async () => {
    const ace = await import("react-ace");
    await import("ace-builds/src-noconflict/mode-sql");
    await import("ace-builds/src-noconflict/theme-dracula");
    await import("ace-builds/src-noconflict/ext-language_tools");
    return ace;
  },
  { ssr: false }
);

export default function SQLConverter() {
  const [mssqlQuery, setMssqlQuery] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const { complete, completion, isLoading, setCompletion } = useCompletion({
    api: "/api/sql-convert",
    onError: (err) => {
      console.error("Completion error:", err);
      toast({
        title: "Error",
        description: "An error occurred during conversion. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConvert = async () => {
    if (mssqlQuery) {
      try {
        await complete(mssqlQuery);
      } catch (err) {
        console.error("Conversion error:", err);
        toast({
          title: "Error",
          description:
            "Failed to convert the query. Please check your input and try again.",
          variant: "destructive",
        });
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(completion).then(
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        toast({
          title: "Success",
          description: "Copied to clipboard!",
          variant: "default",
        });
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast({
          title: "Error",
          description: "Failed to copy text to clipboard.",
          variant: "destructive",
        });
      }
    );
  };

  const clearAllEditors = () => {
    setMssqlQuery("");
    setCompletion("");
  };

  const editorProps = {
    mode: "sql",
    theme: "dracula",
    name: "editor",
    editorProps: { $blockScrolling: true },
    setOptions: {
      useWorker: false,
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      enableSnippets: true,
      showLineNumbers: true,
      showGutter: true,
      tabSize: 2,
      fontSize: 16,
    },
    style: {
      width: "100%",
      height: "400px",
      borderRadius: "0.375rem",
    },
  };

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center">
        AI-Powered SQL Query Converter
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">MSSQL Query</CardTitle>
          </CardHeader>
          <CardContent>
            <AceEditor
              {...editorProps}
              onChange={setMssqlQuery}
              value={mssqlQuery}
            />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">PostgreSQL Query</CardTitle>
          </CardHeader>
          <CardContent>
            <AceEditor
              {...editorProps}
              value={completion}
              readOnly={true}
            />
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-center mt-6 space-x-4">
        <Button
          onClick={handleConvert}
          disabled={!mssqlQuery || isLoading}
          className="text-lg px-6 py-3"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Converting
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-5 w-5" />
              Convert to PostgreSQL
            </>
          )}
        </Button>
        <Button
          onClick={copyToClipboard}
          variant="secondary"
          disabled={!completion}
          className="text-lg px-6 py-3"
        >
          <Copy className="mr-2 h-5 w-5" />
          {copySuccess ? "Copied!" : "Copy"}
        </Button>
        <Button
          onClick={clearAllEditors}
          variant="destructive"
          className="text-lg px-6 py-3"
        >
          <Trash className="mr-2 h-5 w-5" />
          Clear All
        </Button>
      </div>
    </div>
  );
}