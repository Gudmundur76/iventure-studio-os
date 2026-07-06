import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AmplifyHome from "./pages/AmplifyHome";
import AmplifyChat from "./pages/AmplifyChat";
import UpdatesFeed from "./pages/UpdatesFeed";
import UpdatePost from "./pages/UpdatePost";
import AdminUpdates from "./pages/AdminUpdates";

function Router() {
  return (
    <Switch>
      <Route path="/chat" component={AmplifyChat} />
      <Route path="/updates/:slug" component={UpdatePost} />
      <Route path="/updates" component={UpdatesFeed} />
      <Route path="/admin/updates" component={AdminUpdates} />
      <Route path="/" component={AmplifyHome} />
      <Route component={NotFound} />
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
