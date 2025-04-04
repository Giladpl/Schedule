import { Toaster } from "@/components/ui/toaster";
import { ReactNode } from "react";

type AppProps = {
  children: ReactNode;
};

function App({ children }: AppProps) {
  return (
    <div className="h-full flex flex-col">
      {children}
      <Toaster />
    </div>
  );
}

export default App;
