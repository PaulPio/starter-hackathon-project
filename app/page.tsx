import { ResumeFitApp } from "@/components/ResumeFitApp";
import { getJobs } from "@/lib/jobs-source";

export default async function Home() {
  const { jobs } = await getJobs();
  return <ResumeFitApp initialJobs={jobs} />;
}
