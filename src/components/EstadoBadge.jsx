const estadoStyles = {
  pendiente: "bg-amber-100 text-amber-700 border-amber-200",
  confirmado: "bg-blue-100 text-blue-700 border-blue-200",
  entregado: "bg-green-100 text-green-700 border-green-200",
  cancelado: "bg-red-100 text-red-700 border-red-200",
};

const estadoLabels = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export default function EstadoBadge({ estado }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        estadoStyles[estado] || "bg-muted text-muted-foreground"
      }`}
    >
      {estadoLabels[estado] || estado}
    </span>
  );
}