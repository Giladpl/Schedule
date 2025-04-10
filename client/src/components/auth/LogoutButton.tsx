import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { useLocation } from "wouter";

export function LogoutButton() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "התנתקות בוצעה",
        description: "התנתקת בהצלחה מהמערכת",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "שגיאה בהתנתקות",
        description: error.message || "אירעה שגיאה בעת ההתנתקות",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="flex items-center gap-2"
    >
      <LogOut className="h-4 w-4" />
      <span>התנתק</span>
    </Button>
  );
}
