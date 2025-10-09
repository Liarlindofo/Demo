"use client"

import { useState } from "react"
import { MeshGradient, DotOrbit } from "@paper-design/shaders-react"

export function MinimalistBackground() {
  const [intensity, setIntensity] = useState(0.3)
  const [speed, setSpeed] = useState(0.5)

  return (
    <div className="w-full h-full absolute inset-0">
      <MeshGradient
        className="w-full h-full"
        colors={["#000000", "#001F05", "#141415", "#333333"]}
        speed={speed}
      />
      
      {/* Subtle lighting overlay effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/3 w-32 h-32 bg-[#001F05]/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: `${6 / speed}s` }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-[#141415]/5 rounded-full blur-2xl animate-pulse"
          style={{ animationDuration: `${8 / speed}s`, animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/2 right-1/3 w-20 h-20 bg-[#001F05]/8 rounded-full blur-xl animate-pulse"
          style={{ animationDuration: `${10 / speed}s`, animationDelay: "1s" }}
        />
      </div>
    </div>
  )
}
