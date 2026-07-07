import ServicePage from "./ServicePage";

export default function MarketingService() {
  return (
    <ServicePage
      num="03"
    category="Marketing"
    title="Markaðsefni og herferðir"
    tagline="Efni sem umbreytir — skrifað, sniðið og tilbúið til birtingar."
    intro="Frá SEO-bloggfærslum og tölvupóstrunur til auglýsingatexta, efnis í samfélagsmiðla og fullra herferðarlýsinga — Gummi framleiðir heildstæðan efnispakka sem fyrirtæki þitt þarf til að vaxa. Sérhvert stykki er skrifað í rödd vörumerkisins þíns, fínstillt fyrir rás þína og afhent tilbúið til birtingar. Engar breytingar þarf."
    whatYouGet={[
        { icon: "✍️", title: "Efni í takt við vörumerki", desc: "Sérhvert stykki er skrifað til að passa rödd vörumerkisins þíns, tón og markhóp — ekki almenn AI-fyllefni. Við aðlögum okkur að stíl þínum frá fyrstu lýsingu." },
        { icon: "📧", title: "Tölvupóstrunur", desc: "Velkominn flæði, hlúðarrunur, endurþátttökuherferðir — fullar fjöltölvupóstrunur skrifaðar, sniðnar og tilbúnar til hleðslu í ESP þinn." },
        { icon: "📱", title: "Efni í samfélagsmiðla", desc: "Vikur af færslum, þráðum, hringekjum og krókum yfir LinkedIn, X, Instagram og TikTok — skipulagðar, skrifaðar og sniðnar fyrir hvern vettvang." },
        { icon: "🔎", title: "SEO-fínstilltar bloggfærslur", desc: "Langar greinar byggðar á marklyklorðum þínum, skipulagðar fyrir leitarfyrirætlan og skrifaðar til að raða — ekki bara fylla efnisdagatal." },
        { icon: "💰", title: "Auglýsingatextar og lendingarsíður", desc: "Google Ads, Meta Ads, LinkedIn Ads — fyrirsagnir, meginmálstextar og CTAs skrifaðar og prófaðar fyrir umbreytingu, ásamt samsvarandi lendingarsíðum." },
        { icon: "📋", title: "Herferðarlýsingar", desc: "Full herferðarstefnuskjöl — markhópur, skilaboð, rásir, skapandi stefna og KPIs — tilbúin til afhendingar til hvers kyns teymi eða stofnunar." },
    ]}
    howItWorks={[
        { step: "01", title: "Þú deilir lýsingu og vörumerki", desc: "Segðu okkur um vöruna þína, markhóp, markmið og vörumerkisleiðbeiningar. Því meira samhengi sem þú gefur, því meira í takt við vörumerki er framleiðslan." },
        { step: "02", title: "Gummi skipuleggur efnisstefnuna", desc: "Við kortleggjum efnisbygginguna — hvað á að skrifa, fyrir hvaða rás, í hvaða sniði — áður en við skrifum eitt orð." },
        { step: "03", title: "Við skrifum, sníðum og pökkum", desc: "Allt efni er skrifað, sniðið fyrir rás sína og pakkað í eina afhendingu — tilbúið til að afrita-líma eða hlaða upp beint." },
        { step: "04", title: "Þú birtir og vex", desc: "Engar breytingar, engin endursniðning. Efnið þitt er tilbúið til að fara í loftið um leið og það lendir í pósthólfinu þínu." },
    ]}
    useCases={[
        "Vörukynningunarherferð", "Mánaðarlegt bloggefni", "Velkominn tölvupóstrunur", "LinkedIn hugsunarforysta",
        "Google Ads textar", "Instagram efnisdagatal", "SaaS innleiðingartölvupóstar", "B2B hlúðarrunur",
        "Fréttatilkynning", "Dæmisaga", "Fréttabréf", "Podcast-þáttarglósur",
    ]}
    turnaround="24klst"
    startingAt="kr. 4.900"
    />
  );
}
