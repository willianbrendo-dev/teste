import ChecklistsContent from "@/components/ChecklistsContent";

export default function Checklists() {
  return (
    <div className="container mx-auto p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Checklists</h1>
      </div>
      <ChecklistsContent />
    </div>
  );
}
