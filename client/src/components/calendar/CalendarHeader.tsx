import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Settings,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

interface CalendarHeaderProps {
  currentViewStart: Date;
  currentViewEnd: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  currentView: "week" | "month";
  onViewChange: (view: "week" | "month") => void;
  isPreviousDisabled?: boolean;
  isAdmin?: boolean;
  onViewModeToggle?: () => void;
  currentViewMode?: "admin" | "client";
}

export default function CalendarHeader({
  currentViewStart,
  currentViewEnd,
  onPrevious,
  onNext,
  onToday,
  currentView,
  onViewChange,
  isPreviousDisabled = false,
  isAdmin = false,
  onViewModeToggle,
  currentViewMode = "admin",
}: CalendarHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null
  );
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const updateMenuPosition = () => {
    if (settingsButtonRef.current) {
      const rect = settingsButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right - 180 + window.scrollX, // Position menu to the left of button
      });
    }
  };

  const toggleSettings = () => {
    updateMenuPosition();
    setShowSettings(!showSettings);
  };

  useEffect(() => {
    // Create portal container
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.top = "0";
    div.style.left = "0";
    div.style.width = "100%";
    document.body.appendChild(div);
    setPortalContainer(div);

    function handleClickOutside(event: MouseEvent) {
      if (
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(event.target as Node) &&
        portalContainer &&
        !portalContainer.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    // Handle window resize
    const handleResize = () => updateMenuPosition();
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
      if (portalContainer) document.body.removeChild(portalContainer);
    };
  }, [portalContainer]);

  // Format the date range for display
  const formattedDate =
    currentView === "week"
      ? `${format(currentViewStart, "dd MMM", { locale: he })} - ${format(
          currentViewEnd,
          "dd MMM",
          { locale: he }
        )}, ${format(currentViewStart, "yyyy")}`
      : format(currentViewStart, "MMMM yyyy", { locale: he });

  // Toggle view between week and month
  const toggleView = () => {
    onViewChange(currentView === "week" ? "month" : "week");
  };

  return (
    <header className="border-b border-[#dadce0] p-2 md:p-4 flex flex-col md:flex-row items-center justify-between sticky top-0 bg-white z-10">
      <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-start">
        <Button
          onClick={onPrevious}
          disabled={isPreviousDisabled}
          variant="ghost"
          size="icon"
          aria-label="Previous"
          className={cn(
            "rounded-full h-10 w-10",
            isPreviousDisabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        <Button
          onClick={onNext}
          variant="ghost"
          size="icon"
          aria-label="Next"
          className="rounded-full h-10 w-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <span className="text-lg font-medium text-[#3c4043] hidden md:inline">
          {formattedDate}
        </span>

        <Button
          onClick={onToday}
          variant="outline"
          className="ml-2 h-9 bg-[#1a73e8] text-white hover:bg-[#1765cc] hover:text-white border-none"
        >
          היום
        </Button>
      </div>

      <span className="text-lg font-medium text-[#3c4043] md:hidden mt-2">
        {formattedDate}
      </span>

      <div className="flex items-center mt-4 md:mt-0">
        <Button
          onClick={toggleView}
          variant="ghost"
          className="h-9 text-[#3c4043] hover:bg-[#f1f3f4]"
        >
          {currentView === "week" ? "חודש" : "שבוע"}
        </Button>

        {isAdmin && (
          <div className="relative">
            <Button
              onClick={toggleSettings}
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 ml-2"
              ref={settingsButtonRef}
              aria-label="הגדרות"
            >
              <Settings className="h-5 w-5" />
            </Button>

            {showSettings &&
              portalContainer &&
              ReactDOM.createPortal(
                <div
                  className="fixed z-[9999] bg-white shadow-lg rounded-md p-2 border border-gray-200"
                  style={{
                    top: `${menuPosition.top}px`,
                    right: "24px", // Fixed right position
                    width: "200px",
                  }}
                >
                  {isAdmin && onViewModeToggle && (
                    <Button
                      onClick={() => {
                        onViewModeToggle();
                        setShowSettings(false);
                      }}
                      variant="ghost"
                      className="w-full justify-start text-sm font-normal px-3 h-9 hover:bg-gray-100"
                    >
                      <Gauge className="h-4 w-4 mr-2" />
                      {currentViewMode === "admin"
                        ? "מעבר לתצוגת לקוחות"
                        : "מעבר לתצוגת אדמין"}
                    </Button>
                  )}
                </div>,
                portalContainer
              )}
          </div>
        )}

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 ml-2 md:hidden"
            >
              <CalendarDays className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <div className="py-4">
              <div className="text-lg font-medium mb-4">הגדרות לוח שנה</div>
              <div className="space-y-4">
                <div>
                  <Button
                    onClick={() => {
                      onViewChange("week");
                      document
                        .querySelector("[data-radix-collection-item]")
                        ?.dispatchEvent(
                          new KeyboardEvent("keydown", {
                            key: "Escape",
                            bubbles: true,
                          })
                        );
                    }}
                    variant={currentView === "week" ? "default" : "outline"}
                    className="w-full"
                  >
                    תצוגת שבוע
                  </Button>
                </div>
                <div>
                  <Button
                    onClick={() => {
                      onViewChange("month");
                      document
                        .querySelector("[data-radix-collection-item]")
                        ?.dispatchEvent(
                          new KeyboardEvent("keydown", {
                            key: "Escape",
                            bubbles: true,
                          })
                        );
                    }}
                    variant={currentView === "month" ? "default" : "outline"}
                    className="w-full"
                  >
                    תצוגת חודש
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
