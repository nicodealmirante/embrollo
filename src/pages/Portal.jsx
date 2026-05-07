import React from "react";
import DolphinLoader from "@/components/DolphinLoader";

export default function Portal() {
  return (
    <div className="min-h-screen bg-background">
      <DolphinLoader text="Cargando portal..." />
    </div>
  );
}