const DOLPHIN_URL = "https://t3.ftcdn.net/jpg/14/21/11/90/360_F_1421119086_cD3AkH4kxoZjk5WnoKgBjplvlHFQHg1e.jpg";

export default function DolphinLoader({ text = "Cargando..." }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-primary/10 shadow-sm ring-1 ring-primary/10">
        <img
          src={DOLPHIN_URL}
          alt="Cargando"
          className="h-20 w-20 rounded-full object-cover animate-spin"
          style={{ animationDuration: "1.4s" }}
        />
      </div>
      <p className="text-sm font-semibold text-muted-foreground">{text}</p>
    </div>
  );
}
