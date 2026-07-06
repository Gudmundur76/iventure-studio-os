import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AmplifyHome from "./pages/AmplifyHome";
import AmplifyChat from "./pages/AmplifyChat";
import AmplifyNav from "./components/AmplifyNav";
import AmplifyFooter from "./components/AmplifyFooter";

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AmplifyNav />
      {children}
      <AmplifyFooter />
    </>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/chat" component={AmplifyChat} />
      <Route path="/">
        {() => (
          <PublicLayout>
            <AmplifyHome />
          </PublicLayout>
        )}
      </Route>
      <Route>
        {() => (
          <PublicLayout>
            <NotFound />
          </PublicLayout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
