EngagementDashboard.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";

interface Participant {
  id: string;
  name: string;
  streak: number;
}

interface EngagementDashboardProps {
  participants: Participant[];
}

export default function EngagementDashboard({ participants }: EngagementDashboardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement Dashboard</CardTitle>
        <CardDescription>
          Concentration tracking data will be displayed here once the session is active
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Streak</TableHead>
              <TableHead className="text-right">Concentration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((participant) => (
              <TableRow key={participant.id} data-testid={`participant-row-${participant.id}`}>
                <TableCell className="font-medium">{participant.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">Active</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Flame className="w-4 h-4 text-chart-4" />
                    <span>{participant.streak}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  <span className="text-sm">Pending data</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}