export default function BalanceTable({ users, pedidos, pagos }) {
  const balances = users.map((user) => {
    const userPedidos = pedidos.filter(
      (p) => p.usuario_email === user.email && p.estado !== "cancelado"
    );
    const userPagos = pagos.filter((p) => p.usuario_email === user.email);
    const totalPedido = userPedidos.reduce((s, p) => s + (p.total || 0), 0);
    const totalPagado = userPagos.reduce((s, p) => s + (p.monto || 0), 0);
    return {
      ...user,
      totalPedido,
      totalPagado,
      saldo: totalPedido - totalPagado,
    };
  });

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-semibold">Usuario</th>
              <th className="text-right p-3 font-semibold">Total Pedido</th>
              <th className="text-right p-3 font-semibold">Total Pagado</th>
              <th className="text-right p-3 font-semibold">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="p-3">
                  <p className="font-medium">{b.full_name || b.email}</p>
                  <p className="text-xs text-muted-foreground">{b.email}</p>
                </td>
                <td className="p-3 text-right font-medium">
                  ${b.totalPedido.toLocaleString()}
                </td>
                <td className="p-3 text-right font-medium text-green-600">
                  ${b.totalPagado.toLocaleString()}
                </td>
                <td className={`p-3 text-right font-bold ${
                  b.saldo > 0 ? "text-red-600" : "text-green-600"
                }`}>
                  ${b.saldo.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}