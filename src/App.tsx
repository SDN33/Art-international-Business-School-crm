import { CRM } from "@/components/atomic-crm/root/CRM";

/**
 * Application entry point – Art International Business School CRM
 */
const App = () => (
  <CRM
    title="Art International Business School"
    lightModeLogo="./logos/logo_aibs_light.svg"
    darkModeLogo="./logos/logo_aibs_dark.svg"
  />
);

export default App;
