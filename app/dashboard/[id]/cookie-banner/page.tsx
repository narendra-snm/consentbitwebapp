import Container from "./components/Container";

export default function page({ params }: { params: { id: string } }) {
  return (
    <div>
     <Container siteId={params.id}/>
    </div>
  )
}
  