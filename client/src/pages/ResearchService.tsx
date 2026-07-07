import ServicePage from "./ServicePage";

export default function ResearchService() {
  return (
    <ServicePage
      num="02"
      category="Rannsóknir og greining"
      title="Rannsóknir og markaðsgreining"
      tagline="Djúp greind, skipulögð og tilbúin til aðgerða."
      intro="Gummi framkvæmir ítarlegar markaðsrannsóknir, samkeppnisgreiningu og iðnaðarkannanir — og afhendir síðan skipulagðar skýrslur sem þú getur kynnt, birt eða brugðist við strax. Sérhver skýrsla er heimildagreind, tilvísaðar og sniðin að faglegum stöðlum. Ekkert flauð, ekkert fyllefni. Bara greind sem þú þarft til að taka betri ákvarðanir hraðar."
      whatYouGet={[
        { icon: "📊", title: "Skipulagðar skýrslur", desc: "Sérhver afhending er fullsniðið skjal — framkvæmdastjórasamantekt, lykilniðurstöður, gagnaborð og tillögur — tilbúið til kynningar eða deilingar." },
        { icon: "🔍", title: "Rannsóknir frá frumheimildum", desc: "Við förum lengra en yfirborðslegar samantektir. Skýrslur sækja í iðnaðargagnagrunna, skráningar fyrirtækja, fræðilegar heimildir og staðfestar markaðsgögn." },
        { icon: "📈", title: "Samkeppnisgreining", desc: "Skildu nákvæmlega hvar keppinautar þínir standa — staðsetning þeirra, verðlag, styrkleika, veikleika og stefnulega stefnu." },
        { icon: "🎯", title: "Framkvæmanlegar tillögur", desc: "Sérhver skýrsla endar með skýrum, forgangsröðuðum tillögum. Ekki bara gögn — leið áfram." },
        { icon: "📝", title: "Tilvísað og staðfestanlegt", desc: "Allar fullyrðingar eru heimildagreindar og tilvísaðar. Þú getur staðfest sérhvert gagnapunkt og deilt skýrslunni með öryggi." },
        { icon: "🔄", title: "Ótakmarkaðar endurskoðanir", desc: "Þarftu annan sjónarhorn, meiri dýpt á kafla eða annað snið? Spurðu bara. Við endurskoðum þar til það er nákvæmlega það sem þú þarft." },
      ]}
      howItWorks={[
        { step: "01", title: "Þú skilgreinir rannsóknarspurningu", desc: "Segðu okkur hvað þú þarft að skilja. Markaðstækifæri, samkeppnislandslag, iðnaðarþróun, fjárfestingarkenningu — hvert sem spurningin er." },
        { step: "02", title: "Gummi rannsakar og skipuleggur", desc: "Við finnum réttar heimildir, söfnum gögnunum og skipuleggjum niðurstöðurnar í skýrt, rökrétt skýrslurammi." },
        { step: "03", title: "Við skrifum og sníðum skýrsluna", desc: "Full skýrslan er skrifuð, sniðin og yfirfarin fyrir nákvæmni — venjulega afhent innan 48 klukkustunda." },
        { step: "04", title: "Þú færð fullunna skjalið", desc: "Afhent sem PDF, Word-skjal eða Google-skjal — hvaða snið sem hentar best verkflæði þínu." },
      ]}
      useCases={[
        "Markaðsinngangsrannsókn", "Samkeppnislandslag", "Fjárfestingarminnisblað", "Áreiðanleikakönnunarskýrsla", "Iðnaðarþróunargreining",
        "Viðskiptavinaeinstaklingsrannsókn", "Verðlagsvísbending", "Tæknilandslag", "Reglugerðaryfirlit", "Samstarfsmat",
        "Greining á samræmi vöru og markaðar", "Fræðileg bókmenntayfirferð",
      ]}
      turnaround="24–48klst"
      startingAt="kr. 4.900"
    />
  );
}
