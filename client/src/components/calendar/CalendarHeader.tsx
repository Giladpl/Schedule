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
import plantLogo from "../../assets/plant-logo.png";

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
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const updateMenuPosition = () => {
    if (settingsButtonRef.current) {
      const rect = settingsButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        right: window.innerWidth - rect.right,
      });
    }
  };

  const toggleSettings = () => {
    updateMenuPosition();
    setShowSettings(!showSettings);
  };

  useEffect(() => {
    const portalDiv = document.createElement("div");
    portalDiv.style.position = "absolute";
    portalDiv.style.top = "0";
    portalDiv.style.left = "0";
    portalDiv.style.width = "100%";
    document.body.appendChild(portalDiv);
    setPortalContainer(portalDiv);

    return () => {
      document.body.removeChild(portalDiv);
    };
  }, []);

  useEffect(() => {
    if (!portalContainer) return;

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

    const handleResize = () => {
      if (showSettings) {
        updateMenuPosition();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleResize);
    };
  }, [portalContainer, showSettings]);

  const formattedDate =
    currentView === "week"
      ? `${format(currentViewStart, "dd MMM", { locale: he })} - ${format(
          currentViewEnd,
          "dd MMM",
          { locale: he }
        )}, ${format(currentViewStart, "yyyy")}`
      : format(currentViewStart, "MMMM yyyy", { locale: he });

  const [isViewChanging, setIsViewChanging] = useState(false);

  const toggleView = () => {
    setIsViewChanging(true);
    // We'll reset stored state first
    try {
      const cacheKeys = ["lastView", "lastScrollPosition"];
      cacheKeys.forEach((key) => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error("Error clearing cache:", e);
    }

    // Then change the view immediately - the parent will update the time
    onViewChange(currentView === "week" ? "month" : "week");

    // Reset our local loading state after a short delay
    setTimeout(() => setIsViewChanging(false), 300);
  };

  return (
    <header
      className="border-b border-[#dadce0] p-2 md:p-4 flex items-center justify-between sticky top-0 bg-white z-10"
      dir="rtl"
    >
      {/* Right side: Settings and view toggle */}
      <div className="flex items-center order-1 justify-end">
        {isAdmin && (
          <div className="relative ml-2">
            <Button
              onClick={toggleSettings}
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10"
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
                    right: `${menuPosition.right}px`,
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
                      <Gauge className="h-4 w-4 ml-2" />
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

        <Button
          onClick={toggleView}
          variant="outline"
          className="h-9 text-[#3c4043] hover:bg-[#f1f3f4] border border-gray-300 rounded-md px-3 font-medium"
          disabled={isViewChanging}
        >
          {isViewChanging ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {currentView === "week" ? "מבט חודשי" : "מבט שבועי"}
            </span>
          ) : currentView === "week" ? (
            "מבט חודשי"
          ) : (
            "מבט שבועי"
          )}
        </Button>
      </div>

      {/* Center: Date display and navigation */}
      <div className="flex items-center justify-center order-2 space-x-2 space-x-reverse">
        <div className="flex items-center">
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
            onClick={onToday}
            variant="outline"
            className="mx-2 h-9 bg-[#1a73e8] text-white hover:bg-[#1765cc] hover:text-white border-none"
          >
            היום
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
        </div>

        <span className="text-lg font-medium text-[#3c4043] mr-2">
          {formattedDate}
        </span>
      </div>

      {/* Left side: Logo and Mobile menu button */}
      <div className="flex items-center order-3">
        {/* Plant Logo SVG */}
        <div className="h-10 w-10">
          <img src={plantLogo} alt="Logo" className="h-full w-full" />
        </div>

        {/* Mobile menu button - only visible on mobile */}
        <div className="md:hidden ml-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-10 w-10"
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
                      variant="ghost"
                      className="w-full justify-start"
                    >
                      מבט שבועי
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
                      variant="ghost"
                      className="w-full justify-start"
                    >
                      מבט חודשי
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
