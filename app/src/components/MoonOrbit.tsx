import './MoonOrbit.css';

/** The matching ellipse halves share one plane, with the moon between them. */
export default function MoonOrbit() {
  return <div className="moon-system">
    <div className="moon-orbit orbit-one orbit-back" />
    <div className="moon-orbit orbit-two" />
    <div className="hero-moon" />
    <div className="moon-orbit orbit-one orbit-front" />
  </div>;
}
