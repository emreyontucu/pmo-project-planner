import ProjectDetailClient from "./ProjectDetailClient";

export default async function ProjectPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params;
  return <ProjectDetailClient projectId={Number(id)} />;
}
