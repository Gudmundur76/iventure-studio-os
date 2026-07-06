import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import IVLayout from "./components/IVLayout";
import CommandCentre from "./pages/CommandCentre";
import AgentBoard from "./pages/AgentBoard";
import SkillsLibrary from "./pages/SkillsLibrary";
import MemoryViewer from "./pages/MemoryViewer";
import NetworkPanel from "./pages/NetworkPanel";
import CortexPanel from "./pages/CortexPanel";
import Analytics from "./pages/Analytics";
import ClientPortal from "./pages/ClientPortal";

function Router() {
  return (
    <IVLayout>
      <Switch>
        <Route path="/" component={CommandCentre} />
        <Route path="/agents" component={AgentBoard} />
        <Route path="/skills" component={SkillsLibrary} />
        <Route path="/memory" component={MemoryViewer} />
        <Route path="/network" component={NetworkPanel} />
        <Route path="/cortex" component={CortexPanel} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/portal" component={ClientPortal} />
        <Route component={NotFound} />
      </Switch>
    </IVLayout>
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
