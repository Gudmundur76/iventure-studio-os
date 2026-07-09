import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import GiggoHome from "./pages/GiggoHome";
import GiggoChat from "./pages/GiggoChat";
import UpdatesFeed from "./pages/UpdatesFeed";
import UpdatePost from "./pages/UpdatePost";
import AdminUpdates from "./pages/AdminUpdates";
import VoiceClone from "./pages/VoiceClone";
import WebDevService from "./pages/WebDevService";
import ResearchService from "./pages/ResearchService";
import MarketingService from "./pages/MarketingService";
import GummiDemo from "./pages/GummiDemo";
import NanoClawWorker from "./pages/NanoClawWorker";

function Router() {
  return (
    <Switch>
      <Route path="/chat" component={GiggoChat} />
      <Route path="/demo" component={GummiDemo} />
      <Route path="/voice-clone" component={VoiceClone} />
      <Route path="/services/web-development" component={WebDevService} />
      <Route path="/services/research" component={ResearchService} />
      <Route path="/services/marketing" component={MarketingService} />
      <Route path="/updates/:slug" component={UpdatePost} />
      <Route path="/updates" component={UpdatesFeed} />
      <Route path="/admin/updates" component={AdminUpdates} />
      <Route path="/worker" component={NanoClawWorker} />
      <Route path="/" component={GiggoHome} />
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
