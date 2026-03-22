import React, { Suspense } from 'react'
import { Float } from '@react-three/drei'
import Robot from './Robot'

const AssistantExperience = ({ state = 'idle' }) => {
  return (
    <Suspense fallback={null}>
      <Float 
        speed={1.5} 
        rotationIntensity={0.2} 
        floatIntensity={0.5}
        scale={0.7}
      >
        <Robot state={state} />
      </Float>
    </Suspense>
  )
}

export default AssistantExperience
