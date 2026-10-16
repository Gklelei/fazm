/**
 * The consent text shown at registration and on the profile. DRAFT version 1
 * for the academy to review (Data Protection Act 2019). Changing any wording
 * means a new version: add it here and bump CONSENT_VERSION, so every record
 * keeps pointing at the exact text that was agreed to.
 */
export const CONSENT_VERSION = "1";

export type ConsentLanguage = "en" | "sw";

export const CONSENT_TEXT: Record<
  ConsentLanguage,
  { label: string; dataUse: { title: string; body: string }; emergency: { title: string; body: string }; photos: { title: string; body: string } }
> = {
  en: {
    label: "English",
    dataUse: {
      title: "Keeping and using the athlete's information",
      body:
        "Fazam Football Academy keeps the athlete's details (name, date of birth, contacts, guardian, medical and emergency information, documents, attendance, assessments and fees) to run training, keep the athlete safe and manage fees. Only academy staff who need it can see it, and it is never sold or shared for advertising. It is kept while the athlete is with the academy and for up to two years after they leave, unless the law requires longer. You may ask to see, correct or delete it, and you may withdraw this consent at any time by contacting the academy office.",
    },
    emergency: {
      title: "Emergency medical treatment",
      body:
        "If the athlete is injured or falls ill at training or an academy event and a parent or guardian cannot be reached, academy staff may arrange first aid and emergency medical treatment, and may share the athlete's medical details with the people treating them.",
    },
    photos: {
      title: "Photos and videos (optional)",
      body:
        "The academy may take and keep photos and videos of the athlete, including a profile photo in the academy system, and may use them on the academy's social media, website and posters. Saying no does not affect the athlete's place in the academy.",
    },
  },
  sw: {
    label: "Kiswahili",
    dataUse: {
      title: "Kuhifadhi na kutumia taarifa za mwanamichezo",
      body:
        "Fazam Football Academy huhifadhi taarifa za mwanamichezo (jina, tarehe ya kuzaliwa, mawasiliano, mzazi au mlezi, taarifa za afya na dharura, nyaraka, mahudhurio, tathmini na ada) ili kuendesha mazoezi, kumlinda mwanamichezo na kusimamia ada. Ni wafanyakazi wa akademia wanaozihitaji pekee wanaoweza kuziona, na hazitauzwa wala kutolewa kwa matangazo. Zitahifadhiwa muda wote mwanamichezo yuko akademia na hadi miaka miwili baada ya kuondoka, isipokuwa sheria ikitaka muda zaidi. Unaweza kuomba kuziona, kuzirekebisha au kuzifuta, na unaweza kuondoa ridhaa hii wakati wowote kwa kuwasiliana na ofisi ya akademia.",
    },
    emergency: {
      title: "Matibabu ya dharura",
      body:
        "Mwanamichezo akiumia au kuugua wakati wa mazoezi au shughuli ya akademia na mzazi au mlezi hapatikani, wafanyakazi wa akademia wanaweza kupanga huduma ya kwanza na matibabu ya dharura, na kuwapa wanaomtibu taarifa zake za afya.",
    },
    photos: {
      title: "Picha na video (si lazima)",
      body:
        "Akademia inaweza kupiga na kuhifadhi picha na video za mwanamichezo, ikiwemo picha ya wasifu kwenye mfumo wa akademia, na kuzitumia kwenye mitandao ya kijamii, tovuti na mabango ya akademia. Kukataa hakuathiri nafasi ya mwanamichezo katika akademia.",
    },
  },
};
