import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ResumeProfile } from "@/lib/schemas";

export function ProfileAndHealthCheck({
  profile,
  onContinue,
}: {
  profile: ResumeProfile;
  onContinue: () => void;
}) {
  const { healthCheck } = profile;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{profile.name ?? "Your profile"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
          {profile.targetRoles.length > 0 && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Looks like a good fit for:{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {profile.targetRoles.join(", ")}
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resume health check</CardTitle>
          <p className="text-sm text-zinc-500">
            Many strong candidates get filtered out for formatting reasons, not skill gaps — here&apos;s
            what we noticed.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Progress value={healthCheck.overallScore} className="h-2 flex-1" />
            <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums">
              {healthCheck.overallScore}/100
            </span>
          </div>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{healthCheck.summary}</p>

          {healthCheck.weakBullets.length > 0 && (
            <ul className="flex flex-col gap-2 text-sm">
              {healthCheck.weakBullets.slice(0, 4).map((item, i) => (
                <li key={i} className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-900">
                  <p className="text-zinc-500 line-through decoration-zinc-300">{item.text}</p>
                  <p className="mt-1 text-zinc-800 dark:text-zinc-200">{item.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Button size="lg" className="gap-2 self-start" onClick={onContinue}>
        See my matches
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
