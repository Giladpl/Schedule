import { Toaster } from "@/components/ui/toaster";
import { ReactNode } from "react";

type AppProps = {
  children: ReactNode;
}

function App({ children }: AppProps) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

export default App;
