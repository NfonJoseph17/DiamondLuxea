'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function ReportSection({
  title,
  description,
  onExport,
  isEmpty,
  children,
}: {
  title: string;
  description: string;
  onExport: () => void;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onExport} disabled={isEmpty}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="text-sm text-muted-foreground py-4">
            No data for the selected period.
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
