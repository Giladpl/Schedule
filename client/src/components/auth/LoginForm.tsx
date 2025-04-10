import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "שגיאה",
        description: "יש להזין אימייל וסיסמה",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await signIn(email, password);
      toast({
        title: "התחברות בוצעה בהצלחה",
        description: "ברוכים הבאים למערכת ניהול הפגישות",
      });
    } catch (error: any) {
      toast({
        title: "שגיאת התחברות",
        description: error.message || "אירעה שגיאה בהתחברות. אנא נסו שנית",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Card className="w-full max-w-md" dir="rtl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">התחברות למנהלים</CardTitle>
        <CardDescription>התחבר כדי לנהל את יומן הפגישות</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">אימייל</Label>
            <Input
              id="email"
              type="email"
              placeholder="הזן את האימייל שלך"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">סיסמה</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="הזן את הסיסמה שלך"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPassword ? (
                  <EyeOffIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-[#1a73e8] hover:bg-[#1765cc]"
            disabled={isSubmitting}
          >
            {isSubmitting ? "מתחבר..." : "התחבר"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-500">
          רק מנהלי מערכת מורשים יכולים להתחבר
        </p>
      </CardFooter>
    </Card>
  );
}
