import { Card, CardBody, Accordion, AccordionItem } from "@heroui/react";

interface LegendItem {
    id: string | number;
    color: string;
    label: string;
}

interface CollapsableLegendsProps {
    title?: string;
    items?: LegendItem[];
    currentSourceLayer?: string | null;
    defaultOpen?: boolean;
    className?: string;
    position?: "left" | "right";
    variant?: "dark" | "light";
}

export default function CollapsableLegends({
    title = "Legend",
    items = [],
    currentSourceLayer,
    defaultOpen = true,
    className,
    position = "left",
    variant = "dark",
}: CollapsableLegendsProps) {
    const isDark = variant === "dark";

    const bgClass = isDark ? "bg-gray-900/90 backdrop-blur-md" : "bg-white/90 backdrop-blur-md";
    const textColor = isDark ? "text-white" : "text-gray-900";
    const subTextColor = isDark ? "text-white/60" : "text-gray-700/60";
    const borderColor = isDark ? "border-divider" : "border-gray-200";

    return (
        <Card className={`w-[190px] md:w-[230px] ${bgClass} ${className}`} shadow="lg">
            <CardBody className="p-0">
                <Accordion
                    defaultExpandedKeys={defaultOpen ? ["legend"] : []}
                    className="px-0"
                >
                    <AccordionItem
                        key="legend"
                        aria-label={title}
                        title={
                            <h4 className={`text-xs font-semibold md:text-sm ${textColor} ${position === "right" ? "text-right" : ""}`}>
                                {title}
                            </h4>
                        }
                        classNames={{
                            base: "px-2 md:px-3",
                            title: textColor,
                            trigger: "py-2 md:py-3",
                            content: "pb-2 md:pb-3 pt-0",
                        }}
                    >
                        {/* Legend Items */}
                        {items.length > 0 ? (
                            <ul className={`flex flex-col gap-1 text-[10px] md:gap-2 md:text-xs ${textColor}`}>
                                {items.map((item) => (
                                    <li
                                        key={item.id}
                                        className={`flex items-center gap-2 ${position === "right" ? "flex-row-reverse text-right" : ""}`}
                                    >
                                        <span
                                            className="h-3 w-3 flex-shrink-0 rounded-small"
                                            style={{ backgroundColor: item.color }}
                                            aria-hidden="true"
                                        />
                                        <span className="truncate">{item.label}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className={`text-[10px] md:text-xs ${subTextColor} ${position === "right" ? "text-right" : ""}`}>
                                No legend items
                            </p>
                        )}

                        {/* Current Layer Info */}
                        {currentSourceLayer && (
                            <div className={`mt-2 border-t ${borderColor} pt-2 text-[8px] md:text-[10px] ${subTextColor} ${position === "right" ? "text-right" : ""}`}>
                                <span className="font-medium">Layer:</span> {currentSourceLayer}
                            </div>
                        )}
                    </AccordionItem>
                </Accordion>
            </CardBody>
        </Card>
    );
}
