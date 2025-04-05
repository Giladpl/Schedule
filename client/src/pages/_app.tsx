import { GlobalTooltip } from "@/components/ui/time-slot";
import "@/styles/globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function App({ Component, pageProps }: any) {
  console.log("App mounted with GlobalTooltip");

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
      <GlobalTooltip />
    </QueryClientProvider>
  );
}

export default App;
