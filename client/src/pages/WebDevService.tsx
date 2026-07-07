import ServicePage from "./ServicePage";

export default function WebDevService() {
  return (
    <ServicePage
      num="01"
    category="Web Development"
    title="Vefsíður og forrit"
    tagline="Frá lýsingu að lifandi vefslóð — engin kóðun þarf af þinni hálfu."
    intro="Þú lýsir því sem þú þarft. Gummi byggir það. Hvort sem það er markaðsvefsíða, fullt SaaS-verkefni, viðskiptavinagátt eða farsímaforrit — við sjáum um hönnun, þróun og dreifingu frá upphafi til enda. Hvert verkefni er byggt með nútímalegum ramma, fínstillt fyrir hraða og afhent sem lifandi, framleiðslutilbúin vefslóð."
    whatYouGet={[
        { icon: "🌐", title: "Lifandi vefslóð", desc: "Hvert verkefni er keyrt og aðgengilegt frá fyrsta degi. Þú færð raunverulega vefslóð, ekki ZIP-skrá eða Figma-módelið." },
        { icon: "📱", title: "Farsímafyrsta hönnun", desc: "Sérhver síða er fullkomlega svaranleg og prófuð yfir tæki. Notendur þínir fá frábæra upplifun hvort sem þeir eru í síma, spjaldtölvu eða borðtölvu." },
        { icon: "⚡", title: "Hraður og fínstilltur", desc: "Byggður með frammistöðu í huga. Hraðar hleðslutímar, hreinn kóði og Lighthouse-stig yfir 90 að sjálfgefnu." },
        { icon: "🎨", title: "Sérsniðin hönnun", desc: "Engar sniðmát. Hvert verkefni er hannað frá grunni til að passa vörumerkið þitt, markhóp þinn og markmið þín." },
        { icon: "🔒", title: "Öruggt að sjálfgefnu", desc: "HTTPS, öruggar hausar, umhverfisbreytustjórnun og bestu starfsvenjur í auðkenningu innbyggðar frá upphafi." },
        { icon: "♾️", title: "Ótakmarkaðar endurskoðanir", desc: "Ekki ánægður með eitthvað? Segjum okkur bara. Við endurtökum þar til það er nákvæmlega rétt — engar aukagjaldtökur, engar deilur." },
    ]}
    howItWorks={[
        { step: "01", title: "Þú sendir lýsingu", desc: "Lýstu því sem þú þarft á venjulegu máli. Hafðu með tilvísunarsíður, vörumerkisleiðbeiningar eða sérstakar kröfur. Engin tækniþekking þarf." },
        { step: "02", title: "Gummi skipuleggur og byggir", desc: "Við veljum réttan ramma, hönnuðum útlitið, skrifum kóðann og byggjum heildaverkefnið — venjulega innan 24–72 klukkustunda eftir flækjustig." },
        { step: "03", title: "Þú yfirfarir og biður um breytingar", desc: "Við deilum lifandi forskoðunarvefslóð. Þú yfirfarir hana, sendir endurgjöf á venjulegu máli og við gerum breytingarnar." },
        { step: "04", title: "Við setjum upp á léni þínu", desc: "Þegar þú ert ánægður setjum við upp á léni þínu (eða útvegum eitt). Síðan þín er lifandi, skráð og tilbúin til að taka á móti umferð." },
    ]}
    useCases={[
        "SaaS lendingarsíða", "Markaðsvefsíða", "Viðskiptavinagátt", "Netverslun", "Innra tól", "Stjórnborð",
        "Farsímaforrit", "API-samþætting", "Bókunarkerfi", "Aðildarvettvangur", "Blogg eða efnissíða", "Einnar síðu kynningarsíða",
    ]}
    turnaround="24–72klst"
    startingAt="kr. 4.900"
    />
  );
}
