import {
  Baby,
  BookOpen,
  Briefcase,
  Building2,
  Car,
  Dumbbell,
  Factory,
  Hammer,
  Laptop,
  LayoutGrid,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Sparkles,
  Tractor,
  Tv,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  Smartphone,
  Laptop,
  Tv,
  Shirt,
  Sofa,
  Sparkles,
  Baby,
  Car,
  Building2,
  Briefcase,
  Factory,
  Dumbbell,
  Tractor,
  Hammer,
  BookOpen,
  ShoppingBasket,
  Wrench,
  LayoutGrid,
};

/** Category icon by the `icon` key stored in the catalogue. Falls back to a grid. */
export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? LayoutGrid;
  return <Icon className={className} aria-hidden />;
}
