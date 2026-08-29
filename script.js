


// =========================
// FIREBASE (classement en ligne)
// =========================

const firebaseConfig = {
    apiKey: "AIzaSyAmtCq8dR4Y0csYeHXEV2Ma0iMfcuPfNfg",
    authDomain: "magical-snake.firebaseapp.com",
    projectId: "magical-snake",
    storageBucket: "magical-snake.firebasestorage.app",
    messagingSenderId: "466046745543",
    appId: "1:466046745543:web:74fa253710ba45aac4b7e2"
};

let db = null;

try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
} catch (erreur) {
    console.error("Firebase non initialisé :", erreur);
}


let sessionActuelleId = null;
let sessionActuelleRef = null;

function demarrerSessionServeur() {

    if (!db) return;

    db.collection("sessions").add({
        debut: firebase.firestore.FieldValue.serverTimestamp(),
        termine: false
    }).then(function (ref) {
        sessionActuelleId = ref.id;
        sessionActuelleRef = ref;
    }).catch(function (erreur) {
        console.error("Erreur création session :", erreur);
    });

}

const CLE_PSEUDO = "magicalSnakePseudo";

function recupererPseudo() {
    return localStorage.getItem(CLE_PSEUDO);
}

function sauvegarderPseudo(pseudo) {
    try {
        localStorage.setItem(CLE_PSEUDO, pseudo);
    } catch (erreur) {}
}
// =========================
// PROGRESSION DU JOUEUR (sauvegardée dans le navigateur)
// =========================

const CLE_PROGRESSION = "magicalSnakeProgression";

function chargerProgression() {

    let brut = localStorage.getItem(CLE_PROGRESSION);

    if (!brut) {

        return {
            aDejaGagne: false,
            meilleurTemps: null,
            skinDoreActif: false
        };

    }

    try {

        let donnees = JSON.parse(brut);

        return {
            aDejaGagne: donnees.aDejaGagne || false,
            meilleurTemps: (typeof donnees.meilleurTemps === "number") ? donnees.meilleurTemps : null,
            skinDoreActif: donnees.skinDoreActif || false
        };

    } catch (erreur) {

        return {
            aDejaGagne: false,
            meilleurTemps: null,
            skinDoreActif: false
        };

    }

}

const CLE_ID_JOUEUR = "magicalSnakeIdJoueur";

function recupererIdJoueur() {

    let id = localStorage.getItem(CLE_ID_JOUEUR);

    if (!id) {
        id = genererIdAleatoire();
        try {
            localStorage.setItem(CLE_ID_JOUEUR, id);
        } catch (erreur) {
            console.error("Impossible de sauvegarder l'idJoueur :", erreur);
        }
    }

    return id;
}

function genererIdAleatoire() {

    if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);

}

function sauvegarderProgression(progression) {
    try {
        localStorage.setItem(CLE_PROGRESSION, JSON.stringify(progression));
    } catch (erreur) {
        console.error("Stockage indisponible (progression) :", erreur);
    }
}

function enregistrerVictoire(tempsFinal) {

    let progression = chargerProgression();

    progression.aDejaGagne = true;

    if (progression.meilleurTemps === null || tempsFinal < progression.meilleurTemps) {
        progression.meilleurTemps = tempsFinal;
    }

    sauvegarderProgression(progression);

    mettreAJourBoutonLore();

    // Envoi au classement en ligne
    let pseudo = recupererPseudo() || "Anonyme";
    envoyerScoreEnLigne(pseudo, tempsFinal);

}

function envoyerScoreEnLigne(pseudo, tempsFinal) {

    if (!db) return;

    let idJoueur = recupererIdJoueur();

    // Mise à jour de la session : indépendante, ne doit pas bloquer le classement
    if (sessionActuelleRef) {
        sessionActuelleRef.update({
            termine: true,
            temps: tempsFinal
        }).catch(function (erreur) {
            console.error("Erreur mise à jour session :", erreur);
        });
    }

    // Mise à jour du classement : totalement indépendante
    let refClassement = db.collection("classement").doc(idJoueur);

    refClassement.get().then(function (doc) {

        let estMeilleur = !doc.exists || tempsFinal < doc.data().temps;

        if (!estMeilleur) return;

        return refClassement.set({
            pseudo: pseudo,
            temps: tempsFinal,
            sessionRef: sessionActuelleId,
            date: firebase.firestore.FieldValue.serverTimestamp()
        });

    }).catch(function (erreur) {
        console.error("Erreur envoi score classement :", erreur);
    });

}

let canvas = document.getElementById("jeu");
let ctx = canvas.getContext("2d");
let puffsFumee = [];
let boutonJouer = document.getElementById("boutonJouer");
let boutonRegles = document.getElementById("boutonRegles");
let boutonLore = document.getElementById("boutonLore");
let lore = document.getElementById("lore");
let boutonRetourLore = document.getElementById("boutonRetourLore");
let couleurSerpent = "#00a000";
let couleurDoreeJoueurRgb = { r: 0, g: 160, b: 0 };
let tachesSkinJoueur = [];
let tacheTeteJoueur = [];
let skinDoreEnCours = false;
let regles = document.getElementById("regles");
let pause = document.getElementById("pause");
let boutonReprendre = document.getElementById("boutonReprendre");
let boutonRecommencerPause = document.getElementById("boutonRecommencerPause");
let boutonMenuPause = document.getElementById("boutonMenuPause");
let flashFusion = document.getElementById("flashFusion");
let finFusion = document.getElementById("finFusion");
let texteFusion = document.getElementById("texteFusion");
let tempsFusionElement = document.getElementById("tempsFusion");
let canvasSerpentDore = document.getElementById("canvasSerpentDore");
let ctxSerpentDore = canvasSerpentDore.getContext("2d");
let boutonMenuFusion = document.getElementById("boutonMenuFusion");
let canvasFumee = document.getElementById("canvasFumee");
let ctxFumee = canvasFumee.getContext("2d");
let conteneurSerpentDore = document.getElementById("conteneurSerpentDore");
let debutFumee = null;
let animationSerpentDoreActive = false;
let tachesSerpentDore = [];
let couleurBaseDoreeRgb = { r: 0, g: 160, b: 0 };
let messageArene = document.getElementById("messageArene");
let murGaucheEcran = document.getElementById("murGaucheEcran");
let phaseFinaleActive = false;
let enPause = false;
let particules = [];
let texteFusionIntro = document.getElementById("texteFusionIntro");
let cinematiqueDejaDeclenchee = false;
let serpentVenimeuxCine = [];
let historiqueCinematique = [];




let accumulateurCine = 0;
let colonneArretCine = 0;
let muroGaucheArene = -1;
let retardCine = 3; // nombre de cases de retard du serpent venimeux sur le chemin
let vitesseCine = 200; // nettement plus lent, pour bien laisser le temps de comprendre
let derniereEntreeMauvaise = null;
// =========================
// MUSIQUE DU JEU
// Créée entièrement en JavaScript
// =========================

let contexteMusique = null;
let musiqueEnCours = null;
let musiqueTimer = null;
let musiqueEtaitLancee = false;
let notesEnCours = [];
let audioAutorise = false;

let debutChrono = 0;
let tempsPauseAccumule = 0;
let chronoActif = false;

let affichageChrono = document.getElementById("chrono");
let affichageTempsFinal = document.getElementById("tempsFinal");

function formaterTemps(ms) {

    let totalCentiemes = Math.floor(ms / 10);
    let centiemes = totalCentiemes % 100;

    let totalSecondes = Math.floor(totalCentiemes / 100);
    let secondes = totalSecondes % 60;
    let minutes = Math.floor(totalSecondes / 60);

    let pad = function (n, taille) {
        return n.toString().padStart(taille, "0");
    };

    return pad(minutes, 2) + ":" + pad(secondes, 2) + "." + pad(centiemes, 2);

}

function tempsJeu() {
    return Date.now() - tempsPauseAccumule;
}

// =========================
// INITIALISATION AUDIO
// =========================

function initialiserMusique() {

    if (!contexteMusique) {

        contexteMusique = new (
            window.AudioContext ||
            window.webkitAudioContext
        )();

    }

    if (contexteMusique.state === "suspended") {

        contexteMusique.resume();

    }

}


// =========================
// JOUER UNE NOTE
// =========================

function jouerNote(frequence, debut, duree, volume, type = "sine") {

    if (!contexteMusique) return;

    let oscillateur = contexteMusique.createOscillator();
    let gain = contexteMusique.createGain();

    oscillateur.type = type;

    oscillateur.frequency.setValueAtTime(
        frequence,
        debut
    );

    gain.gain.setValueAtTime(
        0.0001,
        debut
    );

    gain.gain.exponentialRampToValueAtTime(
        volume,
        debut + 0.03
    );

    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        debut + duree
    );

    oscillateur.connect(gain);
    gain.connect(contexteMusique.destination);

    oscillateur.start(debut);
    oscillateur.stop(debut + duree + 0.05);

    // On mémorise la note pour pouvoir l'arrêter
    notesEnCours.push(oscillateur);

    oscillateur.onended = function () {

        let index = notesEnCours.indexOf(oscillateur);

        if (index !== -1) {
            notesEnCours.splice(index, 1);
        }

    };

}

function jouerPercussionEpique(debut, volume) {

    if (!contexteMusique) return;

    let oscillateur = contexteMusique.createOscillator();
    let gain = contexteMusique.createGain();

    oscillateur.type = "sine";

    oscillateur.frequency.setValueAtTime(180, debut);
    oscillateur.frequency.exponentialRampToValueAtTime(45, debut + 0.35);

    gain.gain.setValueAtTime(0.0001, debut);
    gain.gain.exponentialRampToValueAtTime(volume, debut + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, debut + 0.4);

    oscillateur.connect(gain);
    gain.connect(contexteMusique.destination);

    oscillateur.start(debut);
    oscillateur.stop(debut + 0.45);

    notesEnCours.push(oscillateur);

    oscillateur.onended = function () {

        let index = notesEnCours.indexOf(oscillateur);

        if (index !== -1) {
            notesEnCours.splice(index, 1);
        }

    };

}

function jouerAccord(frequences, debut, duree, volume) {

    for (let f of frequences) {
        jouerNote(f, debut, duree, volume, "sine");
    }

}



const racinesEpiques = [110.00, 87.31, 130.81, 98.00]; // La - Fa - Do - Sol (graves)

const accordsEpiques = [
    [220.00, 261.63, 329.63],   // La mineur
    [174.61, 220.00, 261.63],   // Fa majeur
    [261.63, 329.63, 392.00],   // Do majeur
    [196.00, 246.94, 293.66]    // Sol majeur
];

function jouerBasseEpique(debut, tempsParTemps, volume) {

    for (let i = 0; i < racinesEpiques.length; i++) {

        jouerNote(
            racinesEpiques[i],
            debut + i * tempsParTemps * 4,
            tempsParTemps * 3.5,
            volume,
            "sine"
        );

        jouerPercussionEpique(
            debut + i * tempsParTemps * 4,
            volume * 2.4
        );

    }

}

function jouerAccordsEpiques(accords, debut, tempsParTemps, volume) {

    for (let i = 0; i < accords.length; i++) {

        jouerAccord(
            accords[i],
            debut + i * tempsParTemps * 8,
            tempsParTemps * 7.5,
            volume
        );

    }

}



function jouerNappeDerive(frequence, debut, duree, volume) {

    if (!contexteMusique) return;

    // Deux oscillateurs très légèrement désaccordés = battement lent et instable
    let osc1 = contexteMusique.createOscillator();
    let osc2 = contexteMusique.createOscillator();
    let gain = contexteMusique.createGain();

    osc1.type = "sine";
    osc2.type = "sine";

    osc1.frequency.setValueAtTime(frequence, debut);
    osc2.frequency.setValueAtTime(frequence * 1.008, debut); // léger désaccord

    // Dérive lente et irrégulière de la hauteur, pour que ça ne sonne jamais stable
    osc1.frequency.linearRampToValueAtTime(frequence * 0.985, debut + duree);
    osc2.frequency.linearRampToValueAtTime(frequence * 1.02, debut + duree);

    gain.gain.setValueAtTime(0.0001, debut);
    gain.gain.exponentialRampToValueAtTime(volume, debut + duree * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(contexteMusique.destination);

    osc1.start(debut); osc1.stop(debut + duree + 0.1);
    osc2.start(debut); osc2.stop(debut + duree + 0.1);

    notesEnCours.push(osc1, osc2);

    osc1.onended = function () {
        let i = notesEnCours.indexOf(osc1);
        if (i !== -1) notesEnCours.splice(i, 1);
    };
    osc2.onended = function () {
        let i = notesEnCours.indexOf(osc2);
        if (i !== -1) notesEnCours.splice(i, 1);
    };

}

function jouerClocheEtrange(frequence, debut, volume) {

    if (!contexteMusique) return;

    let oscillateur = contexteMusique.createOscillator();
    let gain = contexteMusique.createGain();

    oscillateur.type = "sine";
    oscillateur.frequency.setValueAtTime(frequence, debut);

    gain.gain.setValueAtTime(0.0001, debut);
    gain.gain.exponentialRampToValueAtTime(volume, debut + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, debut + 2.2);

    oscillateur.connect(gain);
    gain.connect(contexteMusique.destination);

    oscillateur.start(debut);
    oscillateur.stop(debut + 2.3);

    notesEnCours.push(oscillateur);

    oscillateur.onended = function () {
        let i = notesEnCours.indexOf(oscillateur);
        if (i !== -1) notesEnCours.splice(i, 1);
    };

}

function jouerGrondementSombre(debut, duree, volume) {

    if (!contexteMusique) return;

    let oscillateur = contexteMusique.createOscillator();
    let lfo = contexteMusique.createOscillator();
    let gainLfo = contexteMusique.createGain();
    let gain = contexteMusique.createGain();

    oscillateur.type = "sawtooth";
    oscillateur.frequency.setValueAtTime(38, debut);
    oscillateur.frequency.exponentialRampToValueAtTime(26, debut + duree);

    // Vibrato lent = effet de respiration/grondement vivant
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.6, debut);
    gainLfo.gain.setValueAtTime(2.5, debut);
    lfo.connect(gainLfo);
    gainLfo.connect(oscillateur.frequency);

    gain.gain.setValueAtTime(0.0001, debut);
    gain.gain.exponentialRampToValueAtTime(volume, debut + duree * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);

    oscillateur.connect(gain);
    gain.connect(contexteMusique.destination);

    lfo.start(debut); lfo.stop(debut + duree + 0.1);
    oscillateur.start(debut); oscillateur.stop(debut + duree + 0.1);

    notesEnCours.push(oscillateur, lfo);

    oscillateur.onended = function () {
        let i = notesEnCours.indexOf(oscillateur);
        if (i !== -1) notesEnCours.splice(i, 1);
    };
    lfo.onended = function () {
        let i = notesEnCours.indexOf(lfo);
        if (i !== -1) notesEnCours.splice(i, 1);
    };

}

function jouerCriLointain(debut, volume) {

    if (!contexteMusique) return;

    let oscillateur = contexteMusique.createOscillator();
    let gain = contexteMusique.createGain();

    oscillateur.type = "square";
    oscillateur.frequency.setValueAtTime(1200, debut);
    oscillateur.frequency.exponentialRampToValueAtTime(280, debut + 0.9);

    gain.gain.setValueAtTime(0.0001, debut);
    gain.gain.exponentialRampToValueAtTime(volume, debut + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, debut + 0.9);

    oscillateur.connect(gain);
    gain.connect(contexteMusique.destination);

    oscillateur.start(debut);
    oscillateur.stop(debut + 1.0);

    notesEnCours.push(oscillateur);

    oscillateur.onended = function () {
        let i = notesEnCours.indexOf(oscillateur);
        if (i !== -1) notesEnCours.splice(i, 1);
    };

}

let contexteMortActuel = null;

let fonctionBoucleMusique = null;
let finBoucleMusique = 0;

function programmerBoucleMusique(fn, dureeMs) {

    fonctionBoucleMusique = fn;
    finBoucleMusique = Date.now() + dureeMs;

    musiqueTimer = setTimeout(fn, dureeMs);

}

function arreterMusiqueEnDouceur() {

    if (musiqueTimer) {
        clearTimeout(musiqueTimer);
        musiqueTimer = null;
    }

    fonctionBoucleMusique = null;
    finBoucleMusique = 0;

    // Les notes déjà programmées s'éteignent naturellement,
    // la nouvelle musique démarre par-dessus (fondu, pas de coupure)

}

function arreterMusiqueMort() {

    if (contexteMortActuel) {

        try {
            contexteMortActuel.close();
        } catch (erreur) {}

        contexteMortActuel = null;

    }

}

function musiquePhaseFinale() {

    initialiserMusique();

    // On ne coupe pas brutalement l'ancienne boucle : elle s'éteint
    // naturellement pendant que la nouvelle démarre par-dessus.
    if (musiqueEnCours !== "phaseFinale") {
        arreterMusique();
    }

    musiqueEnCours = "phaseFinale";

    let maintenant = contexteMusique.currentTime + 0.05;
    let dureeBoucle = 18; // boucle longue, difficile à repérer à l'oreille

    // ==== Nappes graves de fond, qui se chevauchent en permanence ====
    jouerNappeDerive(49.00, maintenant, dureeBoucle * 0.6, 0.06);              // sol grave
    jouerNappeDerive(51.91, maintenant + 1, dureeBoucle * 0.55, 0.045);        // seconde mineure, dissonante
    jouerNappeDerive(32.70, maintenant + 5, dureeBoucle * 0.6, 0.055);         // do très grave
    jouerNappeDerive(46.25, maintenant + dureeBoucle - 7, 9, 0.05);            // celle-ci chevauche déjà sur la boucle suivante

    // ==== Cloches étranges, timing et hauteur légèrement aléatoires à chaque passage ====
    let basesCloches = [493.88, 523.25, 415.30, 523.25, 466.16, 392.00, 466.16, 440.00, 415.30];
    let instantsBase = [0.4, 1.8, 3.0, 4.6, 6.1, 7.8, 9.5, 12.0, 14.5];

    for (let i = 0; i < basesCloches.length; i++) {

        let freq = basesCloches[i] * (0.985 + Math.random() * 0.03); // légère variation de hauteur
        let instant = instantsBase[i] + (Math.random() - 0.5) * 0.6;  // léger décalage temporel

        jouerClocheEtrange(freq, maintenant + instant, 0.055 + Math.random() * 0.015);

    }

      programmerBoucleMusique(function () {
        if (musiqueEnCours === "phaseFinale") musiquePhaseFinale();
    }, (dureeBoucle - 2) * 1000);

}

function musiquePoursuite() {

    initialiserMusique();
    arreterMusique();
    musiqueEnCours = "poursuite";

    let tempo = 108;
    let tempsParTemps = 60 / tempo;
    let maintenant = contexteMusique.currentTime + 0.05;

    jouerBasseEpique(maintenant, tempsParTemps, 0.07);
    jouerAccordsEpiques(accordsEpiques, maintenant, tempsParTemps, 0.035);

    let melodie = [
        440.00, 523.25, 440.00, 392.00,
        440.00, 523.25, 659.25, 523.25
    ];

    for (let i = 0; i < melodie.length; i++) {

        jouerNote(
            melodie[i],
            maintenant + i * tempsParTemps,
            tempsParTemps * 0.8,
            0.08,
            "triangle"
        );

    }

    let dureeBoucle = accordsEpiques.length * tempsParTemps * 8;

       programmerBoucleMusique(function () {
        if (musiqueEnCours === "poursuite") musiquePoursuite();
    }, dureeBoucle * 1000);

}


function musiqueCinematique() {

    initialiserMusique();
    arreterMusique();
    musiqueEnCours = "cinematique";

    let tempo = 126;
    let tempsParTemps = 60 / tempo;
    let maintenant = contexteMusique.currentTime + 0.05;

    let melodieBase = [
        220.00, 261.63, 329.63, 261.63,
        220.00, 196.00, 220.00, 261.63,
        329.63, 392.00, 329.63, 261.63,
        220.00, 196.00, 174.61, 196.00
    ];

    // Combien de fois la mélodie se rejoue à la suite, sans coupure
    let nombreRepetitionsMelodie = 3;

    for (let r = 0; r < nombreRepetitionsMelodie; r++) {

        let debutRepetition = maintenant + r * melodieBase.length * tempsParTemps;

        for (let i = 0; i < melodieBase.length; i++) {

            jouerNote(
                melodieBase[i],
                debutRepetition + i * tempsParTemps,
                tempsParTemps * 0.8,
                0.11,
                "sawtooth"
            );

        }

    }

    // Basse et accords : on les répète autant de fois qu'il faut
    // pour qu'ils couvrent toute la durée de la mélodie, sans jamais s'arrêter avant elle
    let dureeUnPassageAccompagnement = accordsEpiques.length * tempsParTemps * 8;
    let dureeTotaleMelodie = nombreRepetitionsMelodie * melodieBase.length * tempsParTemps;
    let nombrePassagesAccompagnement = Math.ceil(dureeTotaleMelodie / dureeUnPassageAccompagnement);

    for (let p = 0; p < nombrePassagesAccompagnement; p++) {

        let debutPassage = maintenant + p * dureeUnPassageAccompagnement;

        jouerBasseEpique(debutPassage, tempsParTemps, 0.10);
        jouerAccordsEpiques(accordsEpiques, debutPassage, tempsParTemps, 0.05);

    }

    let dureeBoucle = dureeTotaleMelodie;

       programmerBoucleMusique(function () {
        if (musiqueEnCours === "cinematique") musiqueCinematique();
    }, dureeBoucle * 1000);

}


function musiqueArene() {

    initialiserMusique();

    if (musiqueEnCours !== "arene") {
        arreterMusiqueEnDouceur();
    }

    musiqueEnCours = "arene";

    let tempo = 96;
    let tempsParTemps = 60 / tempo;
    let maintenant = contexteMusique.currentTime + 0.05;

    // ==== Base partagée (même identité que les deux mouvements précédents) ====

    jouerBasseEpique(maintenant, tempsParTemps, 0.12);
    jouerAccordsEpiques(accordsEpiques, maintenant, tempsParTemps, 0.06);

    jouerBasseEpique(
        maintenant + accordsEpiques.length * tempsParTemps * 8,
        tempsParTemps,
        0.12
    );

    jouerAccordsEpiques(
        accordsEpiques,
        maintenant + accordsEpiques.length * tempsParTemps * 8,
        tempsParTemps,
        0.06
    );

    // ==== Mélodie principale (reprise du thème) ====

    let melodiePrincipale = [
        440.00, 523.25, 659.25, 523.25,
        440.00, 392.00, 440.00, 523.25,
        659.25, 783.99, 659.25, 523.25,
        440.00, 392.00, 349.23, 392.00
    ];

    // ==== Variation (même harmonie, registre plus haut, pour éviter la redondance) ====

    let melodieVariation = [
        523.25, 659.25, 880.00, 783.99,
        659.25, 523.25, 587.33, 659.25,
        783.99, 880.00, 1046.50, 880.00,
        783.99, 659.25, 587.33, 523.25
    ];

    for (let i = 0; i < melodiePrincipale.length; i++) {

        jouerNote(
            melodiePrincipale[i],
            maintenant + i * tempsParTemps,
            tempsParTemps * 0.85,
            0.13,
            "triangle"
        );

    }

    for (let i = 0; i < melodieVariation.length; i++) {

        jouerNote(
            melodieVariation[i],
            maintenant + (melodiePrincipale.length + i) * tempsParTemps,
            tempsParTemps * 0.85,
            0.12,
            "triangle"
        );

    }

    // ==== Petites cloches d'ambiance, exclusives à ce mouvement ====

    let cloches = [1318.51, 1174.66, 987.77, 1046.50];

    for (let i = 0; i < cloches.length; i++) {

        jouerNote(
            cloches[i],
            maintenant + (8 + i * 6) * tempsParTemps,
            tempsParTemps * 2,
            0.03,
            "sine"
        );

    }

    let dureeBoucle = (melodiePrincipale.length + melodieVariation.length) * tempsParTemps;

        programmerBoucleMusique(function () {

        if (musiqueEnCours === "arene") {
            musiqueArene();
        }

    }, dureeBoucle * 1000);

}








// =========================
// MUSIQUE DU MENU
// =========================

function musiqueMenu() {

    initialiserMusique();
    arreterMusique();
    musiqueEnCours = "menuPhase";

    let tempo = 92;
    let tempsParTemps = 60 / tempo;
    let maintenant = contexteMusique.currentTime + 0.05;

    let melodie = [
        523, 587, 659, 587, 523, 494, 523, 587,
        659, 698, 659, 587, 523, 494, 440, 494,
        523, 587, 659, 784, 698, 659, 587, 523,
        494, 523, 587, 659, 587, 523, 494, 440
    ];

    let basse = [
        196, 196, 220, 220, 174, 174, 196, 196,
        220, 220, 247, 247, 196, 196, 174, 174
    ];

    for (let i = 0; i < melodie.length; i++) {
        jouerNote(melodie[i], maintenant + i * tempsParTemps, tempsParTemps * 0.9, 0.055, "triangle");
    }

    for (let i = 0; i < basse.length; i++) {
        jouerNote(basse[i], maintenant + i * tempsParTemps * 2, tempsParTemps * 1.8, 0.035, "sine");
    }

    let ambiance = [659, 784, 698, 587];

    for (let i = 0; i < ambiance.length; i++) {
        jouerNote(ambiance[i], maintenant + (i * 8 + 6) * tempsParTemps, tempsParTemps * 1.5, 0.018, "sine");
    }

    let dureeBoucle = melodie.length * tempsParTemps;

     programmerBoucleMusique(function () {
        if (musiqueEnCours === "menuPhase") musiqueMenu();
    }, dureeBoucle * 1000);

}


// =========================
// MUSIQUE DU JEU
// =========================

function volumeAdapte(frequence, volumeBase) {

    // Les notes aiguës sonnent plus fort/dur à volume égal :
    // on les adoucit progressivement au-delà de 700 Hz.
    if (frequence <= 700) return volumeBase;

    let attenuation = Math.min((frequence - 700) / 500, 0.5);
    return volumeBase * (1 - attenuation);

}

function jouerTransitoireMarteau(debut, volume) {

    if (!contexteMusique) return;

    let dureeTransitoire = 0.02; // 20ms, quasi imperceptible mais essentiel

    let tailleBuffer = Math.floor(contexteMusique.sampleRate * dureeTransitoire);
    let buffer = contexteMusique.createBuffer(1, tailleBuffer, contexteMusique.sampleRate);
    let data = buffer.getChannelData(0);

    for (let i = 0; i < tailleBuffer; i++) {
        data[i] = (Math.random() * 2 - 1); // bruit blanc
    }

    let source = contexteMusique.createBufferSource();
    source.buffer = buffer;

    let filtre = contexteMusique.createBiquadFilter();
    filtre.type = "highpass";
    filtre.frequency.value = 3500; // ne garde que les aigus : c'est ça qui "débouche"

    let gain = contexteMusique.createGain();
    gain.gain.setValueAtTime(volume, debut);
    gain.gain.exponentialRampToValueAtTime(0.0001, debut + dureeTransitoire);

    source.connect(filtre);
    filtre.connect(gain);
    gain.connect(contexteMusique.destination);

    source.start(debut);
    source.stop(debut + dureeTransitoire + 0.01);

}

function jouerNotePiano(frequence, debut, duree, volume) {

    if (!contexteMusique) return;

    // Transitoire d'attaque : c'est lui qui donne la clarté/définition
    jouerTransitoireMarteau(debut, volume * 0.35);

    let harmoniques = [
        { mult: 1, vol: 1.0,  type: "triangle" }, // fondamentale : plus de présence que sine
        { mult: 2, vol: 0.28, type: "sine" },
        { mult: 3, vol: 0.13, type: "sine" },
        { mult: 4, vol: 0.06, type: "sine" }
    ];

    for (let h of harmoniques) {

        let oscillateur = contexteMusique.createOscillator();
        let gain = contexteMusique.createGain();

        oscillateur.type = h.type;
        oscillateur.frequency.setValueAtTime(frequence * h.mult, debut);

        let volumeHarmonique = volume * h.vol;

        gain.gain.setValueAtTime(0.0001, debut);
        gain.gain.exponentialRampToValueAtTime(volumeHarmonique, debut + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);

        oscillateur.connect(gain);
        gain.connect(contexteMusique.destination);

        oscillateur.start(debut);
        oscillateur.stop(debut + duree + 0.05);

        notesEnCours.push(oscillateur);

        oscillateur.onended = function () {
            let index = notesEnCours.indexOf(oscillateur);
            if (index !== -1) notesEnCours.splice(index, 1);
        };

    }

}

function musiqueJeu() {

    initialiserMusique();

    // On ne coupe brutalement que si on vient d'une autre musique.
    // Sinon les notes précédentes s'éteignent naturellement,
    // ce qui évite le "clic" au moment du bouclage.
    if (musiqueEnCours !== "jeu") {
        arreterMusique();
    }

    musiqueEnCours = "jeu";

    let tempo = 105;
    let tempsParTemps = 60 / tempo;
    let maintenant = contexteMusique.currentTime + 0.05;

    let melodie = [

        // ==== Thème original ====
        659, 784, 880, 784,
        659, 587, 659, 784,

        880, 988, 880, 784,
        659, 587, 523, 587,

        659, 784, 880, 1047,
        988, 880, 784, 659,

        587, 659, 784, 659,
        587, 523, 587, 659,

        // ==== Phrase C : montée progressive vers un vrai sommet ====
        587, 659, 784, 880,
        988, 1047, 988, 880,

        1047, 1175, 1047, 988,
        880, 784, 659, 587,

        // ==== Pont : petit rebond puis descente propre, se pose sur 659 ====
        784, 880, 784, 659,
        587, 523, 587, 659

    ];

    let basse = [

        // ==== sous le thème original ====
        220, 220, 196, 196,
        174, 174, 196, 196,

        220, 220, 247, 247,
        196, 196, 174, 174,

        // ==== sous la phrase C ====
        196, 196, 247, 247,
        261, 261, 247, 247,

        // ==== sous le pont ====
        196, 220, 196, 220

    ];

    // Mélodie
    for (let i = 0; i < melodie.length; i++) {
        jouerNote(
            melodie[i],
            maintenant + i * tempsParTemps,
            tempsParTemps * 0.8,
            0.07,
            "triangle"
        );
    }

    // Basse
    for (let i = 0; i < basse.length; i++) {
        jouerNote(
            basse[i],
            maintenant + i * tempsParTemps * 2,
            tempsParTemps * 1.7,
            0.045,
            "sine"
        );
    }

    let dureeBoucle = melodie.length * tempsParTemps;

        programmerBoucleMusique(function () {
        if (musiqueEnCours === "jeu") {
            musiqueJeu();
        }
    }, dureeBoucle * 1000);

}



// =========================
// ARRÊTER LA MUSIQUE
// =========================

function arreterMusique() {

    // Arrête la prochaine boucle
    if (musiqueTimer) {

        clearTimeout(musiqueTimer);
            fonctionBoucleMusique = null;
         finBoucleMusique = 0;
        musiqueTimer = null;

    }

    // Arrête immédiatement toutes les notes encore programmées
    for (let oscillateur of notesEnCours) {

        try {
            oscillateur.stop();
        } catch (erreur) {
            // La note était peut-être déjà terminée
        }

    }

    notesEnCours = [];

    musiqueEnCours = null;
}


let boutonPersonnaliser =
    document.getElementById("boutonPersonnaliser");
let teteApercu =
    document.querySelector(".teteApercu");
let personnaliser =
    document.getElementById("personnaliser");
// Animation de la pomme
let tempsPomme = 0;
let faussesPommes = [];


let banane = {
    x: -1,
    y: -1,
    active: false
};

let controlesInverses = false;
let timeoutInversion = null;

let causeMortElement = document.getElementById("causeMort");
let affichageScoreFinal = document.getElementById("scoreFinal");

function jouerMusiqueTriste() {

    arreterMusiqueMort();

    

    let contexteAudio = new (window.AudioContext || window.webkitAudioContext)();
    contexteMortActuel = contexteAudio;
   

    let notes = [392.00, 349.23, 311.13, 293.66, 261.63];
    let duree = 0.35;

    notes.forEach(function (frequence, index) {

        let oscillateur = contexteAudio.createOscillator();
        let gain = contexteAudio.createGain();

        oscillateur.type = "sine";
        oscillateur.frequency.value = frequence;

        oscillateur.connect(gain);
        gain.connect(contexteAudio.destination);

        let debut = contexteAudio.currentTime + index * duree;

        gain.gain.setValueAtTime(0.0001, debut);
        gain.gain.exponentialRampToValueAtTime(0.25, debut + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);

        oscillateur.start(debut);
        oscillateur.stop(debut + duree);

    });

    // Ferme le contexte audio une fois la mélodie terminée,
    // pour libérer les ressources système
    let dureeTotal = notes.length * duree * 1000;

        setTimeout(function () {

        if (contexteMortActuel === contexteAudio) {
            contexteMortActuel = null;
        }

        try { contexteAudio.close(); } catch (erreur) {}

    }, dureeTotal + 200);

}

let boutonRetourPersonnaliser =
    document.getElementById("boutonRetourPersonnaliser");

let choixCouleur =
    document.getElementById("choixCouleur");

    let morceauxApercu =
    document.querySelectorAll(".morceauApercu");

let blocSkinDore = document.getElementById("blocSkinDore");
let caseSkinDore = document.getElementById("caseSkinDore");
let boutonRetourRegles = document.getElementById("boutonRetourRegles");
let menu = document.getElementById("menu");
let gameOver = document.getElementById("gameOver");
let boutonRejouer = document.getElementById("boutonRejouer");
let boutonMenu = document.getElementById("boutonMenu");
let jeuContainer = document.getElementById("jeuContainer");
// Image du fond du jeu
let fondJeu = new Image();

fondJeu.src = "assets/Jardin2.png";



// Taille d'une case
const taille = 50;

// Nombre de cases
const colonnes = canvas.width / taille;
const lignes = canvas.height / taille;

// Canvas caché pour la grille (dessinée une seule fois)
let canvasGrille = document.createElement("canvas");
canvasGrille.width = canvas.width;
canvasGrille.height = canvas.height;
let ctxGrille = canvasGrille.getContext("2d");

function dessinerGrilleUneFois() {

    ctxGrille.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctxGrille.lineWidth = 1;

    for (let x = 0; x <= colonnes; x++) {
        ctxGrille.beginPath();
        ctxGrille.moveTo(x * taille, 0);
        ctxGrille.lineTo(x * taille, canvas.height);
        ctxGrille.stroke();
    }

    for (let y = 0; y <= lignes; y++) {
        ctxGrille.beginPath();
        ctxGrille.moveTo(0, y * taille);
        ctxGrille.lineTo(canvas.width, y * taille);
        ctxGrille.stroke();
    }

}

dessinerGrilleUneFois();

let serpent = creerSerpent();
let jeuCommence = false;

// Direction
let direction = "droite";
let prochaineDirection = "droite";

// Score
let score = 0;
let affichageScore = document.getElementById("score");

affichageScore.textContent = "Score : " + score;

// État du jeu
let jeuTermine = false



let vitesseBase = 180;
let vitesseActuelle = vitesseBase;
let boostActif = false;
let timeoutBoost = null;
let vitesseArenePostCine = vitesseBase + 30;
let dernierTemps = null;
let accumulateurMouvement = 0;

let raisin = {
    x: -1,
    y: -1,
    active: false
};
// Première pomme
let pomme = {
    x: 10,
    y: 5
};

pomme.active = true; // ajoute ce champ à ton objet pomme existant

let pommeNoire = { x: -1, y: -1, active: false };

let modeFinal = false; // true dès que le score atteint 50
let phaseFin = null;   // null | "libre" | "poursuite"

let historiqueCorps = [];
const delaiPoursuite = 4500; // 4,5 secondes de retard

let finPhaseTimeout = null;
let finPhaseLibre = 0;

let noixDeCoco = {
    x: -1,
    y: -1,
    active: false
};

let kiwi = { x: -1, y: -1, active: false };

let assombrissementActif = false;
let timeoutAssombrissement = null;

// Moment où l'effet a commencé
let tempsDebutAssombrissement = 0;

// Moment où l'effet doit se terminer
let finAssombrissement = 0;

// Chaque kiwi ajoute 12 secondes
const dureeKiwi = 12000;

// Durée totale actuelle de l'effet
let dureeAssombrissementActuelle = 0;

let serpentGros = false;
let timeoutGrossissement = null;

// =========================
// ACTIVATION DE L'AUDIO
// =========================

document.addEventListener("click", function () {

    initialiserMusique();

    audioAutorise = true;

    // Si aucune musique n'est en cours,
    // on démarre celle du menu.
    if (!musiqueEnCours) {

        musiqueMenu();

    }

}, { once: true });

let modalPseudo = document.getElementById("modalPseudo");
let champPseudo = document.getElementById("champPseudo");
let boutonValiderPseudo = document.getElementById("boutonValiderPseudo");
let boutonAnnulerPseudo = document.getElementById("boutonAnnulerPseudo");
let boutonChangerPseudo = document.getElementById("boutonChangerPseudo");
let valeurPseudoActuel = document.getElementById("valeurPseudoActuel");

let contexteModalPseudo = "jeu";

function afficherPseudoActuel() {
    valeurPseudoActuel.textContent = recupererPseudo() || "(non défini)";
}

afficherPseudoActuel();

boutonJouer.addEventListener("click", function () {

    if (!recupererPseudo()) {
        contexteModalPseudo = "jeu";
        modalPseudo.style.display = "flex";
        champPseudo.focus();
        return;
    }

    demarrerPartieDepuisMenu();

});

boutonChangerPseudo.addEventListener("click", function () {

    contexteModalPseudo = "personnaliser";
    champPseudo.value = recupererPseudo() || "";
    modalPseudo.style.display = "flex";
    champPseudo.focus();

});

boutonAnnulerPseudo.addEventListener("click", function () {

    modalPseudo.style.display = "none";
    champPseudo.value = "";

});

function demarrerPartieDepuisMenu() {

    arreterMusique();
    musiqueJeu();

    recommencerJeu(true);

    menu.style.display = "none";
    jeuContainer.style.display = "flex";

}

boutonValiderPseudo.addEventListener("click", function () {

    let valeur = champPseudo.value.trim();

    if (valeur.length === 0) {
        champPseudo.focus();
        return;
    }

    sauvegarderPseudo(valeur);
    modalPseudo.style.display = "none";
    champPseudo.value = "";

    afficherPseudoActuel();

    if (contexteModalPseudo === "personnaliser") {
        contexteModalPseudo = "jeu";
        return;
    }

    demarrerPartieDepuisMenu();

});

champPseudo.addEventListener("keydown", function (event) {

    if (event.key === "Enter") {
        boutonValiderPseudo.click();
    }

});

// OUVRIR LES RÈGLES

boutonRegles.addEventListener("click", function () {

    menu.style.display = "none";

    regles.style.display = "flex";

});

// RETOUR AU MENU

boutonRetourRegles.addEventListener("click", function () {

    regles.style.display = "none";

    menu.style.display = "flex";

});

boutonPersonnaliser.addEventListener("click", function () {

    menu.style.display = "none";

    jeuContainer.style.display = "none";

    personnaliser.style.display = "flex";

});

choixCouleur.addEventListener("input", function () {

    couleurSerpent = choixCouleur.value;

    for (let morceau of morceauxApercu) {

        morceau.style.backgroundColor = couleurSerpent;

    }
 teteApercu.style.backgroundColor = couleurSerpent;

    mettreAJourCouleurDoreeJoueur();
    genererTachesSkinJoueur();

});

boutonRetourPersonnaliser.addEventListener("click", function () {

    personnaliser.style.display = "none";

    menu.style.display = "flex";

});

boutonRejouer.addEventListener("click", function () {

    arreterMusique();
    musiqueJeu();

    recommencerJeu(true);

});


boutonMenu.addEventListener("click", function () {

     arreterMusiqueMort();
     
    gameOver.style.display = "none";

    jeuContainer.style.display = "none";

    menu.style.display = "flex";

    jeuCommence = false;

    jeuTermine = false;

    // Retour à la musique du menu
    musiqueMenu();

});

// =========================
// CLAVIER
// =========================



document.addEventListener("keydown", function (event) {

    let directionDemandee = null;

    if (event.key === "ArrowRight") directionDemandee = "droite";
    if (event.key === "ArrowLeft") directionDemandee = "gauche";
    if (event.key === "ArrowUp") directionDemandee = "haut";
    if (event.key === "ArrowDown") directionDemandee = "bas";

    if (directionDemandee === null) {
        return;
    }

    if (controlesInverses) {

        if (directionDemandee === "droite") directionDemandee = "gauche";
        else if (directionDemandee === "gauche") directionDemandee = "droite";
        else if (directionDemandee === "haut") directionDemandee = "bas";
        else if (directionDemandee === "bas") directionDemandee = "haut";

    }

    

    let directionOpposee =
        (direction === "droite" && directionDemandee === "gauche") ||
        (direction === "gauche" && directionDemandee === "droite") ||
        (direction === "haut" && directionDemandee === "bas") ||
        (direction === "bas" && directionDemandee === "haut");

    if (!directionOpposee) {
        prochaineDirection = directionDemandee;
    }

});

document.addEventListener("keydown", function (event) {

    if (
        event.ctrlKey &&
        (
            event.key === "+" ||
            event.key === "-" ||
            event.key === "=" ||
            event.key === "0"
        )
    ) {

        event.preventDefault();

    }

});

document.addEventListener("wheel", function (event) {

    if (event.ctrlKey) {

        event.preventDefault();

    }

}, { passive: false });

document.addEventListener("keydown", function (event) {

    if (event.key !== "Escape") {
        return;
    }

    if (!jeuCommence || jeuTermine || phaseFin === "fusion") {
        return;
    }

    if (enPause) {
        reprendreJeu();
    } else {
        mettreEnPause();
    }

});

let pauseDebut = null;

function mettreEnPause() {

    enPause = true;

    pause.style.display = "flex";

    if (contexteMusique) {
        contexteMusique.suspend();
    }

    if (musiqueTimer) {
        clearTimeout(musiqueTimer);
        musiqueTimer = null;
    }

    pauseDebut = Date.now();

    if (timeoutBoost) { clearTimeout(timeoutBoost); timeoutBoost = null; }
    if (timeoutInversion) { clearTimeout(timeoutInversion); timeoutInversion = null; }
    if (timeoutGrossissement) { clearTimeout(timeoutGrossissement); timeoutGrossissement = null; }
    if (timeoutAssombrissement) { clearTimeout(timeoutAssombrissement); timeoutAssombrissement = null; }

    if (finPhaseTimeout) { clearTimeout(finPhaseTimeout); finPhaseTimeout = null; }

}

function reprendreJeu() {

    enPause = false;

    pause.style.display = "none";

    dernierTemps = null;

    if (contexteMusique) {
        contexteMusique.resume();
    }

    let dureePause = Date.now() - pauseDebut;

    tempsPauseAccumule += dureePause;

    if (boostActif) {

        finBoost += dureePause;

        timeoutBoost = setTimeout(function () {
            vitesseActuelle = vitesseBase;
            boostActif = false;
            timeoutBoost = null;
        }, finBoost - Date.now());

    }

        if (fonctionBoucleMusique) {

        finBoucleMusique += dureePause;

        musiqueTimer = setTimeout(
            fonctionBoucleMusique,
            Math.max(finBoucleMusique - Date.now(), 0)
        );

    }

    if (controlesInverses) {

        finInversion += dureePause;

        timeoutInversion = setTimeout(function () {
            controlesInverses = false;
            timeoutInversion = null;
        }, finInversion - Date.now());

    }

    if (serpentGros) {

        finGrossissement += dureePause;

        timeoutGrossissement = setTimeout(function () {
            serpentGros = false;
            timeoutGrossissement = null;
        }, finGrossissement - Date.now());

    }

    if (assombrissementActif) {

        tempsDebutAssombrissement += dureePause;
        finAssombrissement += dureePause;

        timeoutAssombrissement = setTimeout(function () {
            assombrissementActif = false;
            timeoutAssombrissement = null;
            tempsDebutAssombrissement = 0;
            finAssombrissement = 0;
        }, finAssombrissement - Date.now());

    }

if (phaseFin === "libre") {

    finPhaseLibre += dureePause;

    finPhaseTimeout = setTimeout(function () {
        activerPoursuite();
    }, finPhaseLibre - Date.now());

}

}

boutonReprendre.addEventListener("click", function () {

    reprendreJeu();

});

boutonRecommencerPause.addEventListener("click", function () {

    enPause = false;

    pause.style.display = "none";

    arreterMusique();
    musiqueJeu();

    recommencerJeu(true);

});

boutonMenuPause.addEventListener("click", function () {

    arreterMusiqueMort();

    enPause = false;

    pause.style.display = "none";

    jeuContainer.style.display = "none";

    menu.style.display = "flex";

    jeuCommence = false;
    jeuTermine = false;

    musiqueMenu();

});

// Donne le décalage perpendiculaire à la direction actuelle
function decalagePour(dir) {

    if (dir === "droite" || dir === "gauche") {
        return { dx: 0, dy: 1 };
    } else {
        return { dx: 1, dy: 0 };
    }

}

// Donne le décalage vers l'AVANT (dans le sens du déplacement)
function decalageAvant(dir) {

    if (dir === "droite") return { dx: 1, dy: 0 };
    if (dir === "gauche") return { dx: -1, dy: 0 };
    if (dir === "haut") return { dx: 0, dy: -1 };
    if (dir === "bas") return { dx: 0, dy: 1 };

}

// Applique un décalage à une cellule, avec repli sur le plateau si on sort
function caseAvecDecalage(cellule, decalage) {

    let x = cellule.x + decalage.dx;
    let y = cellule.y + decalage.dy;

    if (x >= colonnes) x = 0;
    if (x < 0) x = colonnes - 1;

    if (y >= lignes) y = 0;
    if (y < 0) y = lignes - 1;

    return { x: x, y: y };

}

function cellulesGrosseTete(tete, dir) {

    let decalagePerp = decalagePour(dir);
    let decalageLong = decalageAvant(dir);

    let caseLarg = caseAvecDecalage(tete, decalagePerp);
    let caseProf = caseAvecDecalage(tete, decalageLong);
    let caseDiag = caseAvecDecalage(caseLarg, decalageLong);

    return [{ x: tete.x, y: tete.y }, caseLarg, caseProf, caseDiag];

}

// Vérifie si une cellule {x,y} fait partie d'une liste de cellules
function celluleDansListe(liste, cellule) {

    for (let c of liste) {
        if (c.x === cellule.x && c.y === cellule.y) return true;
    }

    return false;

}



function positionOccupee(x, y) {

    for (let morceau of serpent) {
        if (morceau.x === x && morceau.y === y) return true;
    }

    if (pomme.active && pomme.x === x && pomme.y === y) return true;

    if (pommeNoire.active && pommeNoire.x === x && pommeNoire.y === y) return true;

    for (let fp of faussesPommes) {
    if (fp.x === x && fp.y === y) return true;
}

    if (raisin.active && raisin.x === x && raisin.y === y) return true;

    if (kiwi.active && kiwi.x === x && kiwi.y === y) return true;

    if (banane.active && banane.x === x && (banane.y === y || banane.y + 1 === y)) return true;

    if (noixDeCoco.active &&
        x >= noixDeCoco.x && x <= noixDeCoco.x + 1 &&
        y >= noixDeCoco.y && y <= noixDeCoco.y + 1) return true;

    return false;

}

function nouvellePomme() {

    let nouveauX;
    let nouveauY;

    do {

        nouveauX = Math.floor(Math.random() * colonnes);
        nouveauY = Math.floor(Math.random() * lignes);

    } while (positionOccupee(nouveauX, nouveauY));

 pomme.x = nouveauX;
    pomme.y = nouveauY;
    pomme.active = true;
}

function nouvellePommeNoire() {

    let nouveauX;
    let nouveauY;

    do {

        nouveauX = Math.floor(Math.random() * colonnes);
        nouveauY = Math.floor(Math.random() * lignes);

    } while (positionOccupee(nouveauX, nouveauY));

    pommeNoire.x = nouveauX;
    pommeNoire.y = nouveauY;
    pommeNoire.active = true;

}

function declencherModeFinal() {

    modeFinal = true;

    score = 50;

    mettreAJourAffichageScore();

    musiquePhaseFinale();

    jeuContainer.classList.add("foretActive"); // ← ajoute cette ligne

    pomme.active = false;

    // ... reste inchangé

    faussesPommes = [];

    raisin.active = false;
    banane.active = false;
    noixDeCoco.active = false;
    kiwi.active = false;

    if (timeoutBoost) { clearTimeout(timeoutBoost); timeoutBoost = null; }
    boostActif = false;
    vitesseActuelle = vitesseBase;

    if (timeoutInversion) { clearTimeout(timeoutInversion); timeoutInversion = null; }
    controlesInverses = false;

    if (timeoutGrossissement) { clearTimeout(timeoutGrossissement); timeoutGrossissement = null; }
    serpentGros = false;

    if (timeoutAssombrissement) { clearTimeout(timeoutAssombrissement); timeoutAssombrissement = null; }
    assombrissementActif = false;
    tempsDebutAssombrissement = 0;
    finAssombrissement = 0;

    nouvellePommeNoire();

}

function demarrerPhaseLibre() {

    phaseFin = "libre";

    historiqueCorps = [];

    if (finPhaseTimeout) {
        clearTimeout(finPhaseTimeout);
    }

    finPhaseLibre = Date.now() + delaiPoursuite;

    finPhaseTimeout = setTimeout(function () {
        activerPoursuite();
    }, delaiPoursuite);

}

function activerPoursuite() {

    phaseFin = "poursuite";

    musiquePoursuite();

    finPhaseTimeout = null;

    nouvellePomme();

}

function corpsSerpentMauvaisActuel() {

    if (phaseFin !== "poursuite") return null;

    let limite = tempsJeu() - delaiPoursuite;

    let resultat = null;

    for (let entree of historiqueCorps) {

        if (entree.temps <= limite) {
            resultat = entree;
        } else {
            break;
        }

    }

    return resultat;

}

function creerExplosionSombre(x, y) {

    for (let i = 0; i < 12; i++) {

        particules.push({
            x: x * taille + taille / 2,
            y: y * taille + taille / 2,
            vx: (Math.random() - 0.5) * 9,
            vy: (Math.random() - 0.5) * 9,
            taille: Math.random() * 6 + 3,
            vie: 10,
            couleur: Math.random() > 0.3 ? "#8e2de2" : "#1a1024"
        });

    }

}



function tropProcheDuSerpent(x, y) {

    let tete = serpent[0];

    let dx = Math.abs(x - tete.x);
    let dy = Math.abs(y - tete.y);

    // true si la case est à 1 bloc ou moins de la tête (y compris diagonales)
    return dx <= 2 && dy <= 2;

}

function ajouterFaussePomme() {

    let nouveauX;
    let nouveauY;

    do {

        nouveauX = Math.floor(Math.random() * colonnes);
        nouveauY = Math.floor(Math.random() * lignes);

    } while (positionOccupee(nouveauX, nouveauY) || tropProcheDuSerpent(nouveauX, nouveauY));

    faussesPommes.push({ x: nouveauX, y: nouveauY });

}

function nombreCiblePommesEmpoisonnees() {

    if (phaseFinaleActive) {

        return score >= 5 ? 3 : 0;

    }

    if (score >= 30) return 3;
    if (score >= 18) return 2;
    if (score >= 5) return 1;

    return 0;

}

function repositionnerPommesEmpoisonnees() {

    faussesPommes = [];

    let cible = nombreCiblePommesEmpoisonnees();

    for (let i = 0; i < cible; i++) {
        ajouterFaussePomme();
    }

}

function creerSerpent() {

    return [
        { x:4, y:5, direction: "droite" },
        { x:3, y:5, direction: "droite" },
        { x:2, y:5, direction: "droite" }
    ];

}

function recommencerJeu(demarrer) {

 arreterMusiqueMort();

    score = 0;



    affichageScore.textContent = "Score : " + score;

    affichageScore.style.display = "block";
    messageArene.style.display = "none";


    serpent = creerSerpent();

    direction = "droite";
    prochaineDirection = "droite";

   nouvellePomme();

 jeuTermine = false;
 jeuCommence = demarrer;

 
 gameOver.style.display = "none";

 debutChrono = Date.now();
 demarrerSessionServeur();
 tempsPauseAccumule = 0;
 chronoActif = demarrer;

 affichageChrono.textContent = "00:00.00";

 if (affichageTempsFinal) {
    affichageTempsFinal.textContent = "";
}

 faussesPommes = [];

 if (causeMortElement) {
    causeMortElement.textContent = "";
 }

 raisin.active = false;

 vitesseActuelle = vitesseBase;
 boostActif = false;

 if (timeoutBoost) {
    clearTimeout(timeoutBoost);
    timeoutBoost = null;
}
phaseFinaleActive = false;
modeFinal = false;
phaseFin = null;
jeuContainer.classList.remove("murActif");
jeuContainer.classList.remove("foretActive"); 
historiqueCorps = [];
pommeNoire.active = false;
derniereEntreeMauvaise = null;
indexCheminCine = 0;

if (finPhaseTimeout) {
    clearTimeout(finPhaseTimeout);
    finPhaseTimeout = null;
}

banane.active = false;

controlesInverses = false;

if (timeoutInversion) {
    clearTimeout(timeoutInversion);
    timeoutInversion = null;
}

noixDeCoco.active = false;

serpentGros = false;

kiwi.active = false;

assombrissementActif = false;

tempsDebutAssombrissement = 0;
finAssombrissement = 0;

if (timeoutAssombrissement) {
    clearTimeout(timeoutAssombrissement);
    timeoutAssombrissement = null;
}

if (timeoutGrossissement) {
    clearTimeout(timeoutGrossissement);
    timeoutGrossissement = null;
}

cinematiqueDejaDeclenchee = false;
serpentVenimeuxCine = [];
accumulateurCine = 0;
tickCine = 0;
muroGaucheArene = -1;

affichageChrono.style.display = "block";
affichageScore.style.display = "block";
messageArene.style.display = "none";


accumulateurMouvement = 0;

arreterAnimationSerpentDore();

finFusion.style.display = "none";
texteFusion.classList.remove("visible");
tempsFusionElement.classList.remove("visible");
texteFusionIntro.classList.remove("visible");
conteneurSerpentDore.classList.remove("visible");
boutonMenuFusion.classList.remove("visible");
flashFusion.style.opacity = "0";

 dessiner(0);

}
 
// =========================
// MUSIQUE DE MORT GÉNÉRALE
// =========================

function jouerMusiqueMortGenerale() {

    arreterMusiqueMort();

    initialiserMusique();

    if (!contexteMusique) return;

    let maintenant = contexteMusique.currentTime;

    // Nappe grave qui soutient toute la phrase
    let nappe = contexteMusique.createOscillator();
    let gainNappe = contexteMusique.createGain();

    nappe.type = "sine";
    nappe.frequency.setValueAtTime(110, maintenant);
    nappe.frequency.exponentialRampToValueAtTime(73, maintenant + 3.6);

    gainNappe.gain.setValueAtTime(0.0001, maintenant);
    gainNappe.gain.exponentialRampToValueAtTime(0.05, maintenant + 0.3);
    gainNappe.gain.exponentialRampToValueAtTime(0.0001, maintenant + 3.8);

    nappe.connect(gainNappe);
    gainNappe.connect(contexteMusique.destination);
    nappe.start(maintenant);
    nappe.stop(maintenant + 3.9);

    notesEnCours.push(nappe);
    nappe.onended = function () {
        let i = notesEnCours.indexOf(nappe);
        if (i !== -1) notesEnCours.splice(i, 1);
    };

    // Phrase descendante, legato
    let notes = [
        { frequence: 587.33, debut: 0.00, duree: 0.55 },
        { frequence: 523.25, debut: 0.42, duree: 0.55 },
        { frequence: 466.16, debut: 0.84, duree: 0.60 },
        { frequence: 392.00, debut: 1.30, duree: 0.70 },
        { frequence: 349.23, debut: 1.85, duree: 0.85 },
        { frequence: 293.66, debut: 2.55, duree: 1.3 }
    ];

    for (let note of notes) {

        let oscillateur = contexteMusique.createOscillator();
        let gain = contexteMusique.createGain();

        oscillateur.type = "triangle";
        oscillateur.frequency.setValueAtTime(note.frequence, maintenant + note.debut);

        gain.gain.setValueAtTime(0.0001, maintenant + note.debut);
        gain.gain.exponentialRampToValueAtTime(0.09, maintenant + note.debut + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, maintenant + note.debut + note.duree);

        oscillateur.connect(gain);
        gain.connect(contexteMusique.destination);

        oscillateur.start(maintenant + note.debut);
        oscillateur.stop(maintenant + note.debut + note.duree + 0.05);

        notesEnCours.push(oscillateur);

        oscillateur.onended = function () {
            let index = notesEnCours.indexOf(oscillateur);
            if (index !== -1) notesEnCours.splice(index, 1);
        };

    }

}

function terminerJeu(causeTexte, typeMusique) {

    jeuTermine = true;

    chronoActif = false;

    let tempsFinal = Date.now() - debutChrono - tempsPauseAccumule;

    if (affichageTempsFinal) {
        affichageTempsFinal.textContent = "Temps : " + formaterTemps(tempsFinal);
    }

    arreterMusique();

    if (causeMortElement) {
        causeMortElement.textContent = causeTexte;
    }

         if (affichageScoreFinal) {

        let scoreAffiche;

        if (typeof scoreForce !== "undefined") {

            scoreAffiche = scoreForce;

        } else if (!modeFinal && score > 50) {

            scoreAffiche = 50;

        } else if (phaseFinaleActive && !cinematiqueDejaDeclenchee && score > 20) {

            scoreAffiche = 20;

        } else {

            scoreAffiche = score;

        }

        affichageScoreFinal.textContent = "Score final : " + scoreAffiche;

    }

    gameOver.style.display = "flex";

    if (typeMusique === 'triste') {
        jouerMusiqueTriste();
    } else if (typeMusique === 'effrayant') {
        jouerMusiqueEffrayante();
    } else {
        jouerMusiqueMortGenerale();
    }

}

function jouerMusiqueEffrayante() {

    let contexteAudio = new (window.AudioContext || window.webkitAudioContext)();
    let maintenant = contexteAudio.currentTime;

    // ==== Le coup de frayeur ====

    let grondement = contexteAudio.createOscillator();
    let gainGrondement = contexteAudio.createGain();

    grondement.type = "sawtooth";
    grondement.frequency.setValueAtTime(140, maintenant);
    grondement.frequency.exponentialRampToValueAtTime(45, maintenant + 1.4);

    gainGrondement.gain.setValueAtTime(0.0001, maintenant);
    gainGrondement.gain.exponentialRampToValueAtTime(0.18, maintenant + 0.15);
    gainGrondement.gain.exponentialRampToValueAtTime(0.0001, maintenant + 1.6);

    grondement.connect(gainGrondement);
    gainGrondement.connect(contexteAudio.destination);
    grondement.start(maintenant);
    grondement.stop(maintenant + 1.7);

    for (let f of [880, 932]) {

        let osc = contexteAudio.createOscillator();
        let gain = contexteAudio.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(f, maintenant);
        osc.frequency.exponentialRampToValueAtTime(f * 0.5, maintenant + 0.5);

        gain.gain.setValueAtTime(0.0001, maintenant);
        gain.gain.exponentialRampToValueAtTime(0.05, maintenant + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, maintenant + 0.55);

        osc.connect(gain);
        gain.connect(contexteAudio.destination);
        osc.start(maintenant);
        osc.stop(maintenant + 0.6);

    }

      let dureeTotale = 2.2 * 1000;

    setTimeout(function () {

        if (contexteMortActuel === contexteAudio) {
            contexteMortActuel = null;
        }

        try { contexteAudio.close(); } catch (erreur) {}

    }, dureeTotale + 200);
}

function mettreAJourAffichageScore() {

    let valeurAffichee = score;

    if (!modeFinal && score > 50) {

        valeurAffichee = 50;

    } else if (phaseFinaleActive && !cinematiqueDejaDeclenchee && score > 20) {

        valeurAffichee = 20;

    }

    affichageScore.textContent = "Score : " + valeurAffichee;

}

function ajouterScore(valeur) {

    score += valeur;

    mettreAJourAffichageScore();

}

const cheminCinematique = [
    "droite", "droite",
    "bas", "bas", "bas",
    "gauche", "gauche", "gauche",
    "bas", "bas", "bas", "bas",
    "droite", "droite", "droite", "droite", "droite", "droite", "droite",
    "bas", "bas", "bas", "bas",
    "gauche", "gauche", "gauche", "gauche", "gauche",
    "gauche", "gauche", "gauche", "gauche", "gauche",
    "haut", "haut", "haut",
    "gauche", "gauche", "gauche", "gauche", "gauche", 
    "haut" , "haut" , 
    "droite", "droite", "droite", "droite", "droite", "droite", "droite"
];

const ecartCineCases = 6; // écart voulu entre la tête du violet et la queue du vert (4 = longueur du corps + 2 cases)

function calculerDebutSegmentFinal(chemin) {
    let i = chemin.length - 1;
    while (i >= 0 && chemin[i] === "droite") {
        i--;
    }
    return i + 1;
}

const debutSegmentFinalCine = calculerDebutSegmentFinal(cheminCinematique);

const lagCineTicks = 3; // le même écart qu'avant, mais exprimé en "pas de retard"

let tickCine = 0;

function declencherCinematique() {

    cinematiqueDejaDeclenchee = true;

    musiqueCinematique();

    phaseFin = "cinematique";

    // Le mur apparaîtra seulement après la cinématique
    jeuContainer.classList.remove("murActif");

    // Le chrono se fige et disparaît
    chronoActif = false;
    affichageChrono.style.display = "none";
    affichageScore.style.display = "none";

    // Désactivation des objets
    raisin.active = false;
    banane.active = false;
    noixDeCoco.active = false;
    kiwi.active = false;
    faussesPommes = [];
    pomme.active = false;

    if (timeoutBoost) {
        clearTimeout(timeoutBoost);
        timeoutBoost = null;
    }

    boostActif = false;
    vitesseActuelle = vitesseBase;

    if (timeoutInversion) {
        clearTimeout(timeoutInversion);
        timeoutInversion = null;
    }

    controlesInverses = false;

    if (timeoutGrossissement) {
        clearTimeout(timeoutGrossissement);
        timeoutGrossissement = null;
    }

    serpentGros = false;

    if (timeoutAssombrissement) {
        clearTimeout(timeoutAssombrissement);
        timeoutAssombrissement = null;
    }

    assombrissementActif = false;
    tempsDebutAssombrissement = 0;
    finAssombrissement = 0;

    assombrissementActif = false;
    tempsDebutAssombrissement = 0;
    finAssombrissement = 0;


    // ==========================================
    // POSITION DE DÉPART
    // ==========================================

    // Le serpent vert commence ici (décalé pour laisser la place à l'écart)
    let xDepartJoueur = 9;

    serpent = [
        { x: xDepartJoueur,     y: 0, direction: "droite" },
        { x: xDepartJoueur - 1, y: 0, direction: "droite" },
        { x: xDepartJoueur - 2, y: 0, direction: "droite" },
        { x: xDepartJoueur - 3, y: 0, direction: "droite" }
    ];


    // Le serpent violet commence avec l'écart voulu
    let xDepartVenimeux = xDepartJoueur - ecartCineCases;

    serpentVenimeuxCine = [
        { x: xDepartVenimeux,     y: 0, direction: "droite" },
        { x: xDepartVenimeux - 1, y: 0, direction: "droite" },
        { x: xDepartVenimeux - 2, y: 0, direction: "droite" },
        { x: xDepartVenimeux - 3, y: 0, direction: "droite" }
    ];


    // ==========================================
    // HISTORIQUE DE LA TRAJECTOIRE DU VERT
    // (assez d'entrées pour couvrir l'écart dès le 1er tick)
    // ==========================================

    historiqueCinematique = [];

    for (let i = 0; i <= ecartCineCases; i++) {
        historiqueCinematique.push({
            x: xDepartJoueur - i,
            y: 0,
            direction: "droite",
            indexScript: -1
        });
    }


    // Le mur doit être au milieu
    colonneArretCine = Math.floor(colonnes / 2) - 1;

    direction = "droite";
    prochaineDirection = "droite";

    tickCine = 0;
    indexCheminCine = 0;
    accumulateurCine = 0;
}

function avancerCinematique(delta) {

    accumulateurCine += delta;

    while (accumulateurCine >= vitesseCine) {

        accumulateurCine -= vitesseCine;


        // ==========================================
        // 1. LE SERPENT VERT AVANCE
        // ==========================================

        let indexActuel = indexCheminCine;

        let dirJoueur =
            indexActuel < cheminCinematique.length
                ? cheminCinematique[indexActuel]
                : "droite";

        direction = dirJoueur; // garde la direction globale à jour (yeux, langue...)

        let decalageJoueur = decalageAvant(dirJoueur);

        let nouvelleTeteJoueur = {
            x: serpent[0].x + decalageJoueur.dx,
            y: serpent[0].y + decalageJoueur.dy,
            direction: dirJoueur
        };

        serpent.unshift(nouvelleTeteJoueur);
        serpent.pop();


        // ==========================================
        // 2. ON MÉMORISE LA POSITION DU VERT
        // ==========================================

        historiqueCinematique.unshift({
            x: serpent[0].x,
            y: serpent[0].y,
            direction: dirJoueur,
            indexScript: indexActuel
        });

        if (historiqueCinematique.length > 25) {
            historiqueCinematique.pop();
        }


        // ==========================================
        // 3. LE SERPENT VIOLET SUIT LA TRAJECTOIRE DU VERT
        //    AVEC L'ÉCART VOULU
        // ==========================================

        let positionRetard = historiqueCinematique[ecartCineCases];

        if (positionRetard) {

            serpentVenimeuxCine.unshift({
                x: positionRetard.x,
                y: positionRetard.y,
                direction: positionRetard.direction
            });

            serpentVenimeuxCine.pop();
        }


        indexCheminCine++;


        // ==========================================
        // 4. FIN DE LA CINÉMATIQUE : seulement une fois que
        //    le violet est LUI AUSSI dans la ligne droite finale
        // ==========================================

        if (
            positionRetard &&
            positionRetard.indexScript >= debutSegmentFinalCine &&
            serpentVenimeuxCine[0].x >= colonneArretCine
        ) {

            terminerCinematique();
            break;
        }
    }
}

function terminerCinematique() {

    phaseFin = "arene";

    jeuContainer.classList.add("murActif");

    arreterMusique();
    musiqueArene();

    muroGaucheArene = Math.floor(colonnes / 2) - 1;

    accumulateurMouvement = 0;
    dernierTemps = null;

    prochaineDirection = direction;

    affichageChrono.style.display = "block";

    affichageScore.style.display = "none";
    messageArene.style.display = "block";

}

function bougerSerpentArene() {

    let directionTentee = prochaineDirection;

    let tete = {
        x: serpent[0].x,
        y: serpent[0].y,
        direction: directionTentee
    };

    if (directionTentee === "droite") tete.x++;
    if (directionTentee === "gauche") tete.x--;
    if (directionTentee === "haut") tete.y--;
    if (directionTentee === "bas") tete.y++;

    if (tete.x < 0 || tete.x >= colonnes || tete.y < 0 || tete.y >= lignes) {
        return;
    }

    // ==========================================
    // FUSION : le joueur touche la tête du serpent venimeux
    // (vérifiée AVANT le mur, pour que le contact fonctionne
    //  même à travers la paroi violette)
    // ==========================================

       if (
        serpentVenimeuxCine.length > 0 &&
        tete.x === serpentVenimeuxCine[0].x &&
        tete.y === serpentVenimeuxCine[0].y
    ) {

        declencherFusion();
        return;

    }   

    if (tete.x <= muroGaucheArene) {
        return;
    }

    for (let i = 0; i < serpent.length - 1; i++) {
        if (serpent[i].x === tete.x && serpent[i].y === tete.y) {
            return;
        }
    }

    direction = directionTentee;

    serpent.unshift(tete);
    serpent.pop();

}

// =========================
// DEPLACEMENT
// =========================

function bougerSerpent() {


    direction = prochaineDirection;

   let tete = {
    x: serpent[0].x,
    y: serpent[0].y,
    direction: direction
};

    if (direction === "droite") tete.x++;
    if (direction === "gauche") tete.x--;
    if (direction === "haut") tete.y--;
    if (direction === "bas") tete.y++;

    // =========================
// PASSAGE D'UN BORD À L'AUTRE
// =========================

// Sortie à droite
if (tete.x === colonnes) {

    tete.x = 0;

  

}

// Sortie à gauche
if (tete.x < 0) {

    tete.x = colonnes - 1;

 

}

// Sortie en bas
if (tete.y === lignes) {

    tete.y = 0;


    


}

// Sortie en haut
if (tete.y < 0) {

    tete.y = lignes - 1;

   
}

serpent.unshift(tete);

let casesTete = serpentGros
    ? cellulesGrosseTete(tete, tete.direction)
    : [{ x: tete.x, y: tete.y }];

if (collisionSerpent(casesTete)) {

    terminerJeu("Tu t'es mordu la queue !", 'generale')
    return;

}

if (phaseFin === "poursuite") {

    let entreeMauvais = corpsSerpentMauvaisActuel();

    if (entreeMauvais) {

        let corpsMauvais = entreeMauvais.corps;
        let teteMauvais = corpsMauvais[0];

        let cellulesTeteMauvais = entreeMauvais.gros
            ? cellulesGrosseTete(teteMauvais, entreeMauvais.direction)
            : [{ x: teteMauvais.x, y: teteMauvais.y }];

        let collision = false;

        // SEULE notre vraie tête (pas le bloc élargi) compte contre le clone
        let notreVraieTete = { x: tete.x, y: tete.y };

        if (celluleDansListe(corpsMauvais, notreVraieTete)) {
            collision = true;
        }

        // la tête du clone (élargie si lui-même est gros) touche notre corps
        for (let caseMauvaise of cellulesTeteMauvais) {
            for (let segment of serpent) {
                if (segment.x === caseMauvaise.x && segment.y === caseMauvaise.y) {
                    collision = true;
                }
            }
        }

        if (collision) {
         terminerJeu("Un mystérieux serpent vous a croqué ...", 'effrayant', 50);
            return;
        }

    }

}

for (let fp of faussesPommes) {

    if (celluleDansListe(casesTete, fp)) {

        terminerJeu("Tu as croqué une pomme empoisonnée...", 'triste');
        return;

    }

}

let aMangeQuelqueChose = false;

if (raisin.active && celluleDansListe(casesTete, raisin)) {

    raisin.active = false;

    activerBoostVitesse();

    aMangeQuelqueChose = true;

}

if (banane.active && (
    celluleDansListe(casesTete, { x: banane.x, y: banane.y }) ||
    celluleDansListe(casesTete, { x: banane.x, y: banane.y + 1 })
)) {

    banane.active = false;

    activerInversionControles();

    ajouterScore(2);

    aMangeQuelqueChose = true;

}

if (noixDeCoco.active && (
    celluleDansListe(casesTete, { x: noixDeCoco.x, y: noixDeCoco.y }) ||
    celluleDansListe(casesTete, { x: noixDeCoco.x + 1, y: noixDeCoco.y }) ||
    celluleDansListe(casesTete, { x: noixDeCoco.x, y: noixDeCoco.y + 1 }) ||
    celluleDansListe(casesTete, { x: noixDeCoco.x + 1, y: noixDeCoco.y + 1 })
)) {

    noixDeCoco.active = false;

    activerGrossissement();

    ajouterScore(3);

    aMangeQuelqueChose = true;

}

if (kiwi.active && celluleDansListe(casesTete, kiwi)) {

    kiwi.active = false;

    activerAssombrissement();

    ajouterScore(3);

    aMangeQuelqueChose = true;

}

if (modeFinal && pommeNoire.active && celluleDansListe(casesTete, pommeNoire)) {

    let xPommeNoire = pommeNoire.x;
    let yPommeNoire = pommeNoire.y;

    pommeNoire.active = false;

        score = 0;
    mettreAJourAffichageScore();

    if (serpent.length < 6) {
        while (serpent.length < 6) {
            serpent.push(Object.assign({}, serpent[serpent.length - 1]));
        }
    } else {
        serpent = serpent.slice(0, 6);
    }

    creerExplosionSombre(xPommeNoire, yPommeNoire);

    demarrerPhaseLibre();

    aMangeQuelqueChose = true;

}

if (pomme.active && celluleDansListe(casesTete, pomme)) {

    ajouterScore(1);

    creerExplosion(pomme.x, pomme.y);

    nouvellePomme();

    repositionnerPommesEmpoisonnees();

if (phaseFinaleActive) {

        if (score >= 5) {
            nouveauRaisin();
            nouvelleBanane();
            nouvelleNoixDeCoco();
            nouveauKiwi();
        }

    } else {

        if (score >= 8) {
            nouveauRaisin();
        }

        if (score >= 12) {
            nouvelleBanane();
        }

        if (score >= 20) {
            nouvelleNoixDeCoco();
        }

        if (score >= 30) {
            nouveauKiwi();
        }

    }

if (modeFinal && phaseFin === "poursuite") {
    modeFinal = false;
    phaseFinaleActive = true;
}

   

    aMangeQuelqueChose = true;

}

if (!modeFinal && score >= 50) {
    declencherModeFinal();
}

if (phaseFinaleActive && phaseFin === "poursuite" && !cinematiqueDejaDeclenchee && score >= 20) {
    declencherCinematique();
    return;
}

if (!aMangeQuelqueChose) {

    serpent.pop();

}

if (phaseFin) {

    let t = tempsJeu();

    historiqueCorps.push({
        temps: t,
        corps: serpent.map(function (s) { return { x: s.x, y: s.y }; }),
        gros: serpentGros,
        direction: direction
    });

   while (historiqueCorps.length > 0 && historiqueCorps[0].temps < t - (delaiPoursuite + 4000)) {
    historiqueCorps.shift();
}

}

}


function collisionSerpent(casesTete) {

    for (let i = 1; i < serpent.length; i++) {

        let segment = serpent[i];

        for (let caseTete of casesTete) {

            if (caseTete.x === segment.x && caseTete.y === segment.y) {
                return true;
            }

        }

    }

    return false;

}

function creerExplosion(x, y) {

    for (let i = 0; i < 12; i++) {

        particules.push({

            x: x * taille + taille / 2,

            y: y * taille + taille / 2,

         vx: (Math.random() - 0.5) * 9,

            vy: (Math.random() - 0.5) * 9,

            taille: Math.random() * 6 + 3,

            vie: 10,

            couleur: Math.random() > 0.2
                ? "#e53935"
                : "#4caf50"

        });

    }

}

function dessinerTroncPersonnalise(corps, largeur, couleur) {

    if (corps.length < 2) return;

    ctx.strokeStyle = couleur;
    ctx.lineWidth = largeur;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(corps[0].x * taille + taille / 2, corps[0].y * taille + taille / 2);

    for (let i = 1; i < corps.length; i++) {

        let prec = corps[i - 1];
        let actuel = corps[i];

        let distance = Math.abs(actuel.x - prec.x) + Math.abs(actuel.y - prec.y);
        let px = actuel.x * taille + taille / 2;
        let py = actuel.y * taille + taille / 2;

        if (distance > 1) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }

    }

    ctx.stroke();

    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";

}

function dessinerSerpentMauvais(entree) {

    if (!entree || !entree.corps || entree.corps.length === 0) return;

    let corps = entree.corps;
    let directionMauvais =
    entree.direction ||
    corps[0].direction ||
    "droite";

    if (entree.gros) {

        dessinerTroncPersonnalise(corps, taille * 1.7, "#9b30ff");
        dessinerTroncPersonnalise(corps, taille * 0.5, "rgba(255,255,255,0.14)");

        let tete = corps[0];
        let cx = tete.x * taille + taille / 2;
        let cy = tete.y * taille + taille / 2;

        ctx.save();
        ctx.translate(cx, cy);

        if (entree.direction === "droite") ctx.rotate(0);
        if (entree.direction === "bas") ctx.rotate(Math.PI / 2);
        if (entree.direction === "gauche") ctx.rotate(Math.PI);
        if (entree.direction === "haut") ctx.rotate(-Math.PI / 2);

        ctx.save();
        ctx.shadowColor = "#c266ff";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "#9b30ff";
        ctx.beginPath();
        ctx.ellipse(12, 0, 42, 34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#ff2020";
        ctx.beginPath();
        ctx.arc(28, -16, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(28, 16, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        return;

    }

    for (let i = corps.length - 1; i >= 0; i--) {

        let morceau = corps[i];
        let x = morceau.x * taille + 2;
        let y = morceau.y * taille + 2;

        ctx.fillStyle = i === 0 ? "#9b30ff" : "#6a1fb8";
        ctx.beginPath();
        ctx.roundRect(x, y, taille - 4, taille - 4, 12);
        ctx.fill();

        if (i === 0) {

            ctx.save();
            ctx.shadowColor = "#c266ff";
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.roundRect(x, y, taille - 4, taille - 4, 12);
            ctx.fill();
            ctx.restore();

            let cx = x + (taille - 4) / 2;
            let cy = y + (taille - 4) / 2;

            ctx.fillStyle = "#ff2020";
            ctx.beginPath();
            ctx.arc(cx - 8, cy - 6, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 8, cy - 6, 4, 0, Math.PI * 2);
            ctx.fill();

        } else {

            ctx.fillStyle = "rgba(255,255,255,0.10)";
            ctx.beginPath();
            ctx.roundRect(x + 4, y + 4, taille - 18, 8, 8);
            ctx.fill();

        }

    }

}

function dessinerTroncSerpent(largeur, couleur) {

    ctx.strokeStyle = couleur;
    ctx.lineWidth = largeur;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();

    ctx.moveTo(
        serpent[0].x * taille + taille / 2,
        serpent[0].y * taille + taille / 2
    );

    for (let i = 1; i < serpent.length; i++) {

        let prec = serpent[i - 1];
        let actuel = serpent[i];

        let distance = Math.abs(actuel.x - prec.x) + Math.abs(actuel.y - prec.y);

        let px = actuel.x * taille + taille / 2;
        let py = actuel.y * taille + taille / 2;

        if (distance > 1) {
            // téléportation d'un bord à l'autre : on ne relie pas les deux points
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }

    }

    ctx.stroke();

    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";

}


// =========================
// DESSIN
// =========================

function dessiner(delta) {
 
    // =========================
 // FOND DU JEU
 // =========================

ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
);

// =========================
// GRILLE
// =========================

ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
ctx.lineWidth = 1;

ctx.drawImage(canvasGrille, 0, 0);

if (phaseFin === "arene" && muroGaucheArene >= 0) {


    ctx.strokeStyle = "rgba(155, 48, 255, 0.85)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo((muroGaucheArene + 1) * taille, 0);
    ctx.lineTo((muroGaucheArene + 1) * taille, canvas.height);
    ctx.stroke();

   let rectCanvas = canvas.getBoundingClientRect();

murGaucheEcran.style.left = "0px";
murGaucheEcran.style.top = "0px";
murGaucheEcran.style.width = Math.max(rectCanvas.left, 0) + "px";
murGaucheEcran.style.height = "100vh";
murGaucheEcran.style.display = "block";

} else {

    murGaucheEcran.style.display = "none";

}

// =========================
// POMME ANIMÉE
// =========================

tempsPomme += 0.1 * (delta / 180);


// effet respiration
let taillePomme = 18 + Math.sin(tempsPomme) * 3;


let centreX = pomme.x * taille + taille / 2;
let centreY = pomme.y * taille + taille / 2;


// corps de la pomme
if (pomme.active) { 

ctx.fillStyle = "#e53935";

ctx.beginPath();

ctx.arc(
    centreX,
    centreY,
    taillePomme,
    0,
    Math.PI * 2
);

ctx.fill();


// reflet

ctx.fillStyle = "rgba(255,255,255,0.6)";

ctx.beginPath();

ctx.arc(
    centreX - 6,
    centreY - 7,
    4,
    0,
    Math.PI * 2
);

ctx.fill();


// feuille
ctx.fillStyle = "#4caf50";
ctx.beginPath();
ctx.ellipse(
    centreX + 8,
    centreY - 18,
    6,
    12,
    -0.6,
    0,
    Math.PI * 2
);
ctx.fill();
}

if (pommeNoire.active) {

    let cx = pommeNoire.x * taille + taille / 2;
    let cy = pommeNoire.y * taille + taille / 2;
    let tailleNoire = 18 + Math.sin(tempsPomme) * 3;

    ctx.save();
    ctx.shadowColor = "#8e2de2";
    ctx.shadowBlur = 20;

    ctx.fillStyle = "#141018";
    ctx.beginPath();
    ctx.arc(cx, cy, tailleNoire, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = "rgba(180,120,255,0.5)";
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 7, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3a0e5c";
    ctx.beginPath();
    ctx.ellipse(cx + 8, cy - 18, 6, 12, -0.6, 0, Math.PI * 2);
    ctx.fill();

}

// =========================
// POMMES EMPOISONNÉES
// =========================

for (let fp of faussesPommes) {

    let centreFauxX = fp.x * taille + taille / 2;
    let centreFauxY = fp.y * taille + taille / 2;

    let tailleFausse = 18 + Math.sin(tempsPomme) * 3;

    // corps
    ctx.fillStyle = "#e53935";
    ctx.beginPath();
    ctx.arc(centreFauxX, centreFauxY, tailleFausse, 0, Math.PI * 2);
    ctx.fill();

    // morsure en haut à gauche
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(
        centreFauxX - tailleFausse * 0.7,
        centreFauxY - tailleFausse * 0.7,
        tailleFausse * 0.55,
        0,
        Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    // reflet
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(centreFauxX - 6, centreFauxY - 7, 4, 0, Math.PI * 2);
    ctx.fill();

    // feuille
    ctx.fillStyle = "#4caf50";
    ctx.beginPath();
    ctx.ellipse(centreFauxX + 8, centreFauxY - 18, 6, 12, -0.6, 0, Math.PI * 2);
    ctx.fill();

}

// =========================
// RAISIN (bonus vitesse)
// =========================

if (raisin.active) {

    let centreRaisinX = raisin.x * taille + taille / 2;
    let centreRaisinY = raisin.y * taille + taille / 2;

    let grains = [
        { dx: -8, dy: -6 },
        { dx: 8, dy: -6 },
        { dx: 0, dy: -14 },
        { dx: -8, dy: 6 },
        { dx: 8, dy: 6 },
        { dx: 0, dy: 0 }
    ];

    ctx.fillStyle = "#7b2d8e";

    for (let grain of grains) {

        ctx.beginPath();
        ctx.arc(
            centreRaisinX + grain.dx,
            centreRaisinY + grain.dy,
            6,
            0,
            Math.PI * 2
        );
        ctx.fill();

    }

    // reflet sur le grain du haut
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(centreRaisinX - 2, centreRaisinY - 16, 2, 0, Math.PI * 2);
    ctx.fill();

    // petite tige
    ctx.strokeStyle = "#4caf50";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centreRaisinX, centreRaisinY - 20);
    ctx.lineTo(centreRaisinX + 4, centreRaisinY - 26);
    ctx.stroke();

}





// =========================
// BANANE (inverse les contrôles, 2 cases, verticale, fermée)
// =========================

if (banane.active) {

    let centreBananeX = banane.x * taille + taille / 2;
    let hautY = banane.y * taille + 8;
    let basY = banane.y * taille + taille * 2 - 8;

    ctx.save();

    ctx.translate(centreBananeX, (hautY + basY) / 2);
    ctx.rotate(0.1);
    ctx.translate(-centreBananeX, -(hautY + basY) / 2);

    // =========================
    // CORPS DE LA BANANE (peau entière, incurvée)
    // =========================

    let degradePeau = ctx.createLinearGradient(
        centreBananeX - 14, hautY,
        centreBananeX + 14, basY
    );
    degradePeau.addColorStop(0, "#ffe873");
    degradePeau.addColorStop(0.55, "#f7d227");
    degradePeau.addColorStop(1, "#e0a900");

    ctx.fillStyle = degradePeau;

    ctx.beginPath();
    ctx.moveTo(centreBananeX - 6, hautY + 6);
    ctx.bezierCurveTo(
        centreBananeX + 18, hautY + (basY - hautY) * 0.3,
        centreBananeX + 18, hautY + (basY - hautY) * 0.7,
        centreBananeX + 6, basY - 4
    );
    ctx.quadraticCurveTo(
        centreBananeX, basY + 4,
        centreBananeX - 6, basY - 4
    );
    ctx.bezierCurveTo(
        centreBananeX - 14, hautY + (basY - hautY) * 0.7,
        centreBananeX - 14, hautY + (basY - hautY) * 0.3,
        centreBananeX - 6, hautY + 6
    );
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#c99400";
    ctx.lineWidth = 1;
    ctx.stroke();

    // =========================
    // NERVURES (les 2-3 lignes naturelles de la peau)
    // =========================

    ctx.strokeStyle = "rgba(170, 120, 0, 0.35)";
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(centreBananeX + 4, hautY + 10);
    ctx.bezierCurveTo(
        centreBananeX + 13, hautY + (basY - hautY) * 0.35,
        centreBananeX + 13, hautY + (basY - hautY) * 0.7,
        centreBananeX + 2, basY - 6
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centreBananeX - 8, hautY + 12);
    ctx.bezierCurveTo(
        centreBananeX - 4, hautY + (basY - hautY) * 0.35,
        centreBananeX - 4, hautY + (basY - hautY) * 0.7,
        centreBananeX - 9, basY - 8
    );
    ctx.stroke();

    // =========================
    // REFLET
    // =========================

    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(centreBananeX - 1, hautY + 14);
    ctx.bezierCurveTo(
        centreBananeX + 8, hautY + (basY - hautY) * 0.35,
        centreBananeX + 8, hautY + (basY - hautY) * 0.65,
        centreBananeX, basY - 14
    );
    ctx.stroke();
    ctx.lineCap = "butt";

    // =========================
    // QUEUE (petite pointe en haut uniquement, marron nuancé)
    // =========================

    let degradeQueue = ctx.createRadialGradient(
        centreBananeX - 3, hautY + 1, 0.5,
        centreBananeX - 3, hautY + 2, 6
    );
    degradeQueue.addColorStop(0, "#8a5a2b");
    degradeQueue.addColorStop(0.6, "#6b4423");
    degradeQueue.addColorStop(1, "#4a2f18");

 ctx.fillStyle = degradeQueue;
    ctx.beginPath();
    ctx.ellipse(centreBananeX - 3, hautY + 2, 4, 6, 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

}

// =========================
// NOIX DE COCO (rend le serpent plus gros, 4 cases uniformes)
// =========================

if (noixDeCoco.active) {

    let centreCocoX = noixDeCoco.x * taille + taille;
    let centreCocoY = noixDeCoco.y * taille + taille;
    let rayonCoco = taille * 0.85;

    let degradeCoco = ctx.createRadialGradient(
        centreCocoX - 15, centreCocoY - 15, 5,
        centreCocoX, centreCocoY, rayonCoco
    );
    degradeCoco.addColorStop(0, "#8a6a4a");
    degradeCoco.addColorStop(0.6, "#6b4a2f");
    degradeCoco.addColorStop(1, "#4a3220");

    ctx.fillStyle = degradeCoco;
    ctx.beginPath();
    ctx.arc(centreCocoX, centreCocoY, rayonCoco, 0, Math.PI * 2);
    ctx.fill();

    // texture fibreuse
    ctx.strokeStyle = "rgba(40, 25, 12, 0.35)";
    ctx.lineWidth = 1.5;

    for (let i = 0; i < 10; i++) {

        let angle = (Math.PI * 2 / 10) * i;

        ctx.beginPath();
        ctx.moveTo(
            centreCocoX + Math.cos(angle) * rayonCoco * 0.3,
            centreCocoY + Math.sin(angle) * rayonCoco * 0.3
        );
        ctx.lineTo(
            centreCocoX + Math.cos(angle) * rayonCoco * 0.9,
            centreCocoY + Math.sin(angle) * rayonCoco * 0.9
        );
        ctx.stroke();

    }

    // les 3 "yeux" de la noix de coco
    ctx.fillStyle = "#2a1a0e";

    let positionsYeux = [
        { dx: 0, dy: -10 },
        { dx: -9, dy: 8 },
        { dx: 9, dy: 8 }
    ];

    for (let oeilCoco of positionsYeux) {

        ctx.beginPath();
        ctx.ellipse(
            centreCocoX + oeilCoco.dx,
            centreCocoY + oeilCoco.dy,
            4, 5, 0, 0, Math.PI * 2
        );
        ctx.fill();

    }

    // reflet
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.arc(centreCocoX - 20, centreCocoY - 22, 10, 0, Math.PI * 2);
    ctx.fill();

}

// =========================
// KIWI (assombrit l'écran)
// =========================

if (kiwi.active) {

    let centreKiwiX = kiwi.x * taille + taille / 2;
    let centreKiwiY = kiwi.y * taille + taille / 2;
    let rayonKiwi = 21;

   // peau brune et duveteuse
ctx.fillStyle = "#8a6a3a";

ctx.beginPath();

ctx.arc(
    centreKiwiX,
    centreKiwiY,
    rayonKiwi,
    0,
    Math.PI * 2
);

ctx.fill();


// chair verte
ctx.fillStyle = "#b6d94c";

ctx.beginPath();

ctx.arc(
    centreKiwiX,
    centreKiwiY,
    rayonKiwi - 5,
    0,
    Math.PI * 2
);

ctx.fill();


// coeur blanc
ctx.fillStyle = "#f5f5e6";

ctx.beginPath();

ctx.arc(
    centreKiwiX,
    centreKiwiY,
    6,
    0,
    Math.PI * 2
);

ctx.fill();


// graines
ctx.fillStyle = "#2a1a0e";

let nombreGraines = 14;

for (let i = 0; i < nombreGraines; i++) {

    let angle =
        (Math.PI * 2 / nombreGraines) * i;

    let gx =
        centreKiwiX +
        Math.cos(angle) *
        (rayonKiwi - 10);

    let gy =
        centreKiwiY +
        Math.sin(angle) *
        (rayonKiwi - 10);

    ctx.beginPath();

    ctx.arc(
        gx,
        gy,
        1.6,
        0,
        Math.PI * 2
    );

    ctx.fill();

}


// reflet
ctx.fillStyle = "rgba(255,255,255,0.35)";

ctx.beginPath();

ctx.arc(
    centreKiwiX - 8,
    centreKiwiY - 8,
    4,
    0,
    Math.PI * 2
);

ctx.fill();

}

if (phaseFin === "poursuite") {

    if (!enPause) {
        derniereEntreeMauvaise = corpsSerpentMauvaisActuel();
    }

    dessinerSerpentMauvais(derniereEntreeMauvaise);

} else if (phaseFin === "cinematique" || phaseFin === "arene" || phaseFin === "fusion") {

    dessinerSerpentMauvais({
    corps: serpentVenimeuxCine,
    gros: false,
    direction: serpentVenimeuxCine[0].direction || "droite"
});

}

// =========================
// CORPS DU SERPENT
// =========================

if (serpentGros) {

    if (skinDoreEnCours) {

        dessinerTroncSerpentDore(taille * 1.7);

    } else {

        dessinerTroncSerpent(taille * 1.7, couleurSerpent);
        dessinerTroncSerpent(taille * 0.5, "rgba(255,255,255,0.18)");

    }

} else {

    for (let i = 1; i < serpent.length; i++) {

        let morceau = serpent[i];

        let x = morceau.x * taille + 2;
        let y = morceau.y * taille + 2;

        if (skinDoreEnCours) {

            dessinerSegmentDore(x, y, taille - 4, taille - 4, i);

        } else {

            ctx.fillStyle = couleurSerpent;
            ctx.beginPath();
            ctx.roundRect(x, y, taille - 4, taille - 4, 12);
            ctx.fill();

            ctx.fillStyle = "rgba(255,255,255,0.18)";
            ctx.beginPath();
            ctx.roundRect(x + 4, y + 4, taille - 18, 8, 8);
            ctx.fill();

        }

    }

}

   
// =========================
// TÊTE DU SERPENT
// =========================

let tete = serpent[0];

let positionTeteX = tete.x * taille;
let positionTeteY = tete.y * taille;

let directionTete = tete.direction || direction;

let centreTeteX = positionTeteX + taille / 2;
let centreTeteY = positionTeteY + taille / 2;


// =====================================================
// SERPENT NORMAL : ANCIEN STYLE
// =====================================================

if (!serpentGros) {

       if (skinDoreEnCours) {

        dessinerSegmentDore(
            positionTeteX + 1,
            positionTeteY + 1,
            taille - 2,
            taille - 2,
            999,
            tacheTeteJoueur
        );

    } else {

        ctx.fillStyle = couleurSerpent;

        ctx.beginPath();

        ctx.roundRect(
            positionTeteX + 1,
            positionTeteY + 1,
            taille - 2,
            taille - 2,
            18
        );

        ctx.fill();

    }

    // Yeux

    let oeil1X;
    let oeil1Y;
    let oeil2X;
    let oeil2Y;

    let pupilleDecalageX = 0;
    let pupilleDecalageY = 0;


    if (directionTete === "droite") {

        oeil1X = centreTeteX + 10;
        oeil1Y = centreTeteY - 11;

        oeil2X = centreTeteX + 10;
        oeil2Y = centreTeteY + 11;

        pupilleDecalageX = 3;
    }

    if (directionTete === "gauche") {

        oeil1X = centreTeteX - 10;
        oeil1Y = centreTeteY - 11;

        oeil2X = centreTeteX - 10;
        oeil2Y = centreTeteY + 11;

        pupilleDecalageX = -3;
    }

    if (directionTete === "haut") {

        oeil1X = centreTeteX - 11;
        oeil1Y = centreTeteY - 10;

        oeil2X = centreTeteX + 11;
        oeil2Y = centreTeteY - 10;

        pupilleDecalageY = -3;
    }

    if (directionTete === "bas") {

        oeil1X = centreTeteX - 11;
        oeil1Y = centreTeteY + 10;

        oeil2X = centreTeteX + 11;
        oeil2Y = centreTeteY + 10;

        pupilleDecalageY = 3;
    }


    ctx.fillStyle = "white";

    ctx.beginPath();
    ctx.arc(oeil1X, oeil1Y, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(oeil2X, oeil2Y, 7, 0, Math.PI * 2);
    ctx.fill();


    ctx.fillStyle = "black";

    ctx.beginPath();
    ctx.arc(
        oeil1X + pupilleDecalageX,
        oeil1Y + pupilleDecalageY,
        3,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
        oeil2X + pupilleDecalageX,
        oeil2Y + pupilleDecalageY,
        3,
        0,
        Math.PI * 2
    );
    ctx.fill();


    // Langue fourchue

    let dirVecteurs = {
        droite: { dx: 1, dy: 0 },
        gauche: { dx: -1, dy: 0 },
        haut:   { dx: 0, dy: -1 },
        bas:    { dx: 0, dy: 1 }
    };

    let vecteur = dirVecteurs[directionTete] || dirVecteurs["droite"];

    let perpX = -vecteur.dy;
    let perpY = vecteur.dx;

    let langueBaseX, langueBaseY;

    if (directionTete === "droite") { langueBaseX = positionTeteX + taille; langueBaseY = centreTeteY; }
    if (directionTete === "gauche") { langueBaseX = positionTeteX; langueBaseY = centreTeteY; }
    if (directionTete === "haut")   { langueBaseX = centreTeteX; langueBaseY = positionTeteY; }
    if (directionTete === "bas")    { langueBaseX = centreTeteX; langueBaseY = positionTeteY + taille; }
   
    let langueOndulation = Math.sin(tempsPomme * 3) * 1.5;

    let milieuX = langueBaseX + vecteur.dx * 11 + perpX * langueOndulation;
    let milieuY = langueBaseY + vecteur.dy * 11 + perpY * langueOndulation;

    let pointeGaucheX = milieuX + vecteur.dx * 7 - perpX * 5;
    let pointeGaucheY = milieuY + vecteur.dy * 7 - perpY * 5;

    let pointeDroiteX = milieuX + vecteur.dx * 7 + perpX * 5;
    let pointeDroiteY = milieuY + vecteur.dy * 7 + perpY * 5;

    ctx.strokeStyle = "red";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";

    ctx.beginPath();

    ctx.moveTo(langueBaseX, langueBaseY);
    ctx.lineTo(milieuX, milieuY);

    ctx.moveTo(milieuX, milieuY);
    ctx.lineTo(pointeGaucheX, pointeGaucheY);

    ctx.moveTo(milieuX, milieuY);
    ctx.lineTo(pointeDroiteX, pointeDroiteY);

    ctx.stroke();

    ctx.lineCap = "butt";
}


// =====================================================
// SERPENT GROS : STYLE SLITHER.IO
// =====================================================

else {

    ctx.save();

    ctx.translate(centreTeteX, centreTeteY);

    if (direction === "droite") ctx.rotate(0);
    if (direction === "bas") ctx.rotate(Math.PI / 2);
    if (direction === "gauche") ctx.rotate(Math.PI);
    if (direction === "haut") ctx.rotate(-Math.PI / 2);


       // tête allongée

    ctx.fillStyle = skinDoreEnCours
        ? rgbVersChaine(nuancerCouleur(couleurDoreeJoueurRgb, 0.15))
        : couleurSerpent;

    ctx.beginPath();

    ctx.ellipse(
        12,
        0,
        42,
        34,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // léger reflet

    ctx.fillStyle = "rgba(255,255,255,0.16)";

    ctx.beginPath();

    ctx.ellipse(
        15,
        -12,
        28,
        8,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // yeux

    ctx.fillStyle = "white";

    ctx.beginPath();
    ctx.arc(28, -16, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(28, 16, 10, 0, Math.PI * 2);
    ctx.fill();


    // pupilles

    ctx.fillStyle = "black";

    ctx.beginPath();
    ctx.arc(32, -16, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(32, 16, 4, 0, Math.PI * 2);
    ctx.fill();


    // langue fourchue

    ctx.strokeStyle = "#e53935";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    ctx.beginPath();

    ctx.moveTo(48, 0);
    ctx.lineTo(68, 0);

    ctx.moveTo(68, 0);
    ctx.lineTo(76, -7);

    ctx.moveTo(68, 0);
    ctx.lineTo(76, 7);

    ctx.stroke();

    ctx.restore();
}


// =====================================================
// LANGUE DU SERPENT NORMAL
// =====================================================

if (!serpentGros) {

    let langueDebutX;
    let langueDebutY;
    let langueFinX;
    let langueFinY;

    if (directionTete === "droite") {

        langueDebutX = positionTeteX + taille;
        langueDebutY = centreTeteY;

        langueFinX = langueDebutX + 15;
        langueFinY = langueDebutY;
    }

    if (directionTete === "gauche") {

        langueDebutX = positionTeteX;
        langueDebutY = centreTeteY;

        langueFinX = langueDebutX - 15;
        langueFinY = langueDebutY;
    }

    if (directionTete === "haut") {

        langueDebutX = centreTeteX;
        langueDebutY = positionTeteY;

        langueFinX = langueDebutX;
        langueFinY = langueDebutY - 15;
    }

    if (directionTete === "bas") {

        langueDebutX = centreTeteX;
        langueDebutY = positionTeteY + taille;

        langueFinX = langueDebutX;
        langueFinY = langueDebutY + 15;
    }

    ctx.strokeStyle = "red";
    ctx.lineWidth = 4;

    ctx.beginPath();

    ctx.moveTo(langueDebutX, langueDebutY);
    ctx.lineTo(langueFinX, langueFinY);

    ctx.stroke();
}

for (let i = particules.length - 1; i >= 0; i--) {

    let p = particules[i];

    ctx.fillStyle = p.couleur;

    ctx.beginPath();

    ctx.arc(
        p.x,
        p.y,
        p.taille,
        0,
        Math.PI * 2
    );

    ctx.fill();

 p.x += p.vx * (delta / 180);

    p.y += p.vy * (delta / 180);

    p.taille *= Math.pow(0.95, delta / 180);

    p.vie -= delta / 180;

    if (p.vie <= 0) {

        particules.splice(i, 1);

    }

    }

if (controlesInverses) {

    let dureeClignotement = 1800; // les 1,8 dernières secondes avant la fin de l'effet
    let tempsRestantInversion = finInversion - Date.now();
    let afficherTexteInversion = true;

    if (tempsRestantInversion <= dureeClignotement && tempsRestantInversion > 0) {

        let tempsEcouleClignotement = dureeClignotement - tempsRestantInversion;
        afficherTexteInversion = Math.floor(tempsEcouleClignotement / 300) % 2 === 0;

    }

    if (afficherTexteInversion) {

        ctx.fillStyle = "rgba(244, 208, 63, 0.9)";
        ctx.font = "bold 26px Arial";
        ctx.textAlign = "center";
        ctx.fillText("CONTRÔLES INVERSÉS !", canvas.width / 2, 40);
        ctx.textAlign = "left";

    }

}

// =========================
// BROUILLARD (effet kiwi)
// =========================

if (assombrissementActif) {

    // Temps écoulé depuis le premier kiwi
    let tempsEcoule =
        Date.now() - tempsDebutAssombrissement;


    // ==========================================
    // CALCUL DE L'OPACITÉ
    // ==========================================

    let opacite;


    // 0 → 1 seconde
    // L'obscurité commence
    if (tempsEcoule < 1000) {

        opacite =
            0.10 +
            (tempsEcoule / 1000) * 0.20;

    }


    // 1 → 3 secondes
    // On commence à voir beaucoup moins
    else if (tempsEcoule < 3000) {

        let progression =
            (tempsEcoule - 1000) / 2000;

        opacite =
            0.30 +
            progression * 0.30;

    }


    // 3 → 5 secondes
    // Très sombre
    else if (tempsEcoule < 5000) {

        let progression =
            (tempsEcoule - 3000) / 2000;

        opacite =
            0.60 +
            progression * 0.20;

    }


    // 5 → 8 secondes
    // QUASIMENT NOIR
    else {

        let progression =
            Math.min(
                (tempsEcoule - 5000) / 3000,
                1
            );

        opacite =
            0.80 +
            progression * 0.15;

    }


    // ==========================================
    // BROUILLARD NOIR
    // ==========================================

    ctx.fillStyle =
        "rgba(0, 0, 0, " + opacite + ")";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // Les yeux restent visibles
    dessinerYeuxDansBrouillard();

}

}

function dessinerYeuxDansBrouillard() {

    let tete = serpent[0];

    let centreTeteX =
        tete.x * taille + taille / 2;

    let centreTeteY =
        tete.y * taille + taille / 2;


    let oeil1X;
    let oeil1Y;

    let oeil2X;
    let oeil2Y;

    let pupilleDecalageX = 0;
    let pupilleDecalageY = 0;


    // ==========================================
    // EXACTEMENT LES MÊMES POSITIONS
    // QUE LES YEUX NORMAUX
    // ==========================================

    if (direction === "droite") {

        oeil1X = centreTeteX + 10;
        oeil1Y = centreTeteY - 11;

        oeil2X = centreTeteX + 10;
        oeil2Y = centreTeteY + 11;

        pupilleDecalageX = 3;

    }

    else if (direction === "gauche") {

        oeil1X = centreTeteX - 10;
        oeil1Y = centreTeteY - 11;

        oeil2X = centreTeteX - 10;
        oeil2Y = centreTeteY + 11;

        pupilleDecalageX = -3;

    }

    else if (direction === "haut") {

        oeil1X = centreTeteX - 11;
        oeil1Y = centreTeteY - 10;

        oeil2X = centreTeteX + 11;
        oeil2Y = centreTeteY - 10;

        pupilleDecalageY = -3;

    }

    else if (direction === "bas") {

        oeil1X = centreTeteX - 11;
        oeil1Y = centreTeteY + 10;

        oeil2X = centreTeteX + 11;
        oeil2Y = centreTeteY + 10;

        pupilleDecalageY = 3;

    }


    let yeux = [
        {
            x: oeil1X,
            y: oeil1Y
        },
        {
            x: oeil2X,
            y: oeil2Y
        }
    ];


    // ==========================================
    // LUMIÈRE
    // ==========================================

    for (let oeil of yeux) {

        let lueur =
            ctx.createRadialGradient(
                oeil.x,
                oeil.y,
                0,
                oeil.x,
                oeil.y,
                25
            );

        lueur.addColorStop(
            0,
            "rgba(255, 240, 100, 1)"
        );

        lueur.addColorStop(
            0.35,
            "rgba(255, 230, 70, 0.65)"
        );

        lueur.addColorStop(
            1,
            "rgba(255, 220, 50, 0)"
        );

        ctx.fillStyle = lueur;

        ctx.beginPath();

        ctx.arc(
            oeil.x,
            oeil.y,
            25,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // ==========================================
        // OEIL BLANC
        // EXACTEMENT LA MÊME TAILLE
        // ==========================================

        ctx.fillStyle = "white";

        ctx.beginPath();

        ctx.arc(
            oeil.x,
            oeil.y,
            7,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // ==========================================
        // PUPILLE
        // ==========================================

        ctx.fillStyle = "black";

        ctx.beginPath();

        ctx.arc(
            oeil.x + pupilleDecalageX,
            oeil.y + pupilleDecalageY,
            3,
            0,
            Math.PI * 2
        );

        ctx.fill();

    }

}

let finBoost = 0;

function activerBoostVitesse() {

    if (!boostActif) {
        vitesseActuelle = Math.round(vitesseBase / 1.2);
        boostActif = true;
    }

    finBoost = Date.now() + 5000;

    if (timeoutBoost) {
        clearTimeout(timeoutBoost);
    }

    timeoutBoost = setTimeout(function () {

        vitesseActuelle = vitesseBase;
        boostActif = false;
        timeoutBoost = null;

    }, finBoost - Date.now());

}

let finInversion = 0;

function activerInversionControles() {

    controlesInverses = true;

    finInversion = Date.now() + 8000;

    if (timeoutInversion) {
        clearTimeout(timeoutInversion);
    }

    timeoutInversion = setTimeout(function () {

        controlesInverses = false;
        timeoutInversion = null;

    }, finInversion - Date.now());

}

let finGrossissement = 0;

function activerGrossissement() {

    serpentGros = true;

    finGrossissement = Date.now() + 8000;

    if (timeoutGrossissement) {
        clearTimeout(timeoutGrossissement);
    }

    timeoutGrossissement = setTimeout(function () {

        serpentGros = false;
        timeoutGrossissement = null;

    }, finGrossissement - Date.now());

}

function nouveauRaisin() {

    let nouveauX;
    let nouveauY;

    do {

        nouveauX = Math.floor(Math.random() * colonnes);
        nouveauY = Math.floor(Math.random() * lignes);

    } while (positionOccupee(nouveauX, nouveauY));

    raisin.x = nouveauX;
    raisin.y = nouveauY;
    raisin.active = true;

}

function nouveauKiwi() {

    let nouveauX;
    let nouveauY;

    do {

        nouveauX = Math.floor(Math.random() * colonnes);
        nouveauY = Math.floor(Math.random() * lignes);

    } while (positionOccupee(nouveauX, nouveauY));

    kiwi.x = nouveauX;
    kiwi.y = nouveauY;
    kiwi.active = true;

}

function activerAssombrissement() {

    let maintenant = Date.now();

    // ==========================================
    // PREMIER KIWI
    // ==========================================

    if (!assombrissementActif) {

        assombrissementActif = true;

        tempsDebutAssombrissement = maintenant;

        finAssombrissement =
            maintenant + dureeKiwi;

    }

    // ==========================================
    // KIWI SUPPLÉMENTAIRE
    // ==========================================

    else {

        finAssombrissement += dureeKiwi;

    }


    // ==========================================
    // NOUVEAU TIMER
    // ==========================================

    if (timeoutAssombrissement) {

        clearTimeout(timeoutAssombrissement);

    }

    let tempsRestant =
        finAssombrissement - maintenant;

    timeoutAssombrissement = setTimeout(function () {

        assombrissementActif = false;

        timeoutAssombrissement = null;

        tempsDebutAssombrissement = 0;

        finAssombrissement = 0;

    }, tempsRestant);

}

function nouvelleBanane() {

    let nouveauX;
    let nouveauY;

    do {

        nouveauX = Math.floor(Math.random() * colonnes);
        // lignes - 1 pour être sûr que la 2e case (nouveauY + 1) reste dans le plateau
        nouveauY = Math.floor(Math.random() * (lignes - 1));

    } while (positionOccupee(nouveauX, nouveauY) || positionOccupee(nouveauX, nouveauY + 1));

    banane.x = nouveauX;
    banane.y = nouveauY;
    banane.active = true;

}

function nouvelleNoixDeCoco() {

    let nouveauX;
    let nouveauY;

    do {

        nouveauX = Math.floor(Math.random() * (colonnes - 1));
        nouveauY = Math.floor(Math.random() * (lignes - 1));

    } while (
        positionOccupee(nouveauX, nouveauY) ||
        positionOccupee(nouveauX + 1, nouveauY) ||
        positionOccupee(nouveauX, nouveauY + 1) ||
        positionOccupee(nouveauX + 1, nouveauY + 1)
    );

    noixDeCoco.x = nouveauX;
    noixDeCoco.y = nouveauY;
    noixDeCoco.active = true;

}

// =========================
// MUSIQUE DE LA FUSION
// =========================

function jouerMusiqueFusion() {

    initialiserMusique();
    arreterMusique();
    musiqueEnCours = "fusion";

    let maintenant = contexteMusique.currentTime + 0.05;

    // Accord d'ouverture, chaleureux et résolu
    jouerAccord([261.63, 329.63, 392.00, 523.25], maintenant, 3.5, 0.09);

    // Arpège ascendant, comme une lumière qui monte
    let arpege = [392.00, 493.88, 587.33, 659.25, 783.99, 987.77];

    for (let i = 0; i < arpege.length; i++) {
        jouerNote(arpege[i], maintenant + 0.4 + i * 0.35, 1.4, 0.075, "triangle");
    }

    // Cloches scintillantes, comme des reflets dorés
    let cloches = [1046.50, 1318.51, 1567.98, 1174.66];

    for (let i = 0; i < cloches.length; i++) {
        jouerClocheEtrange(
            cloches[i] * (0.995 + Math.random() * 0.01),
            maintenant + 1.2 + i * 0.9,
            0.05
        );
    }

    // Accord final, plus large et apaisé
    jouerAccord([196.00, 261.63, 329.63, 392.00, 493.88], maintenant + 4.2, 5, 0.08);

    let dureeBoucle = 9;

       programmerBoucleMusique(function () {
        if (musiqueEnCours === "fusion") jouerMusiqueFusion();
    }, dureeBoucle * 1000);

}

// =========================
// MUSIQUE DE LA PAGE LORE
// =========================

// =========================
// MUSIQUE DE LA PAGE LORE
// =========================

// =========================
// MUSIQUE DE LA PAGE LORE
// =========================

function musiqueLore() {

    initialiserMusique();

    if (musiqueEnCours !== "lore") {
        arreterMusique();
    }

    musiqueEnCours = "lore";

    let maintenant = contexteMusique.currentTime + 0.05;

    // Légèrement plus rapide que la version originale
    // 0.94 = environ 6 % plus rapide
    const vitesseLore = 0.94;

    // ==========================================
    // PROGRESSION HARMONIQUE (La dorien)
    // ==========================================

    let accords = [

        // ---- Phrase A : on s'éloigne ----
        { upper: [220.00, 261.63, 329.63, 392.00], basse: 110.00, duree: 9 },   // Am7
        { upper: [174.61, 220.00, 261.63, 329.63], basse: 73.42,  duree: 9 },   // Dm7
        { upper: [196.00, 246.94, 293.66, 329.63], basse: 98.00,  duree: 9 },   // G6
        { upper: [261.63, 329.63, 392.00, 493.88], basse: 65.41, duree: 10 },   // Cmaj7

        // ---- Phrase B : on revient ----
        { upper: [174.61, 220.00, 261.63, 329.63], basse: 87.31, duree: 9 },    // Fmaj7
        { upper: [164.81, 196.00, 246.94, 293.66], basse: 82.41, duree: 9 },    // Em7
        { upper: [196.00, 246.94, 293.66, 349.23], basse: 98.00, duree: 8 },     // G6
        { upper: [220.00, 261.63, 329.63, 392.00], basse: 55.00, duree: 14 }    // Am7
    ];

    let curseur = 0;
    let debutsAccords = [];

    for (let a of accords) {
        debutsAccords.push(curseur);
        curseur += a.duree;
    }

    let dureeTotale = curseur * vitesseLore;

    // ==========================================
    // ACCORDS + BASSE
    // ==========================================

    for (let i = 0; i < accords.length; i++) {

        let debut = maintenant + debutsAccords[i] * vitesseLore;
        let a = accords[i];

        let estResolutionFinale = (i === accords.length - 1);

        let volume = estResolutionFinale
            ? 0.024
            : 0.019 + Math.sin((i / (accords.length - 1)) * Math.PI) * 0.008;

        jouerAccord(
            a.upper,
            debut,
            a.duree * 1.15 * vitesseLore,
            volume
        );

        jouerNote(
            a.basse,
            debut,
            a.duree * 0.95 * vitesseLore,
            volume * 1.6,
            "sine"
        );
    }

    // ==========================================
    // NAPPES GRAVES
    // ==========================================

    jouerNappeDerive(
        55.00,
        maintenant,
        dureeTotale * 0.6,
        0.022
    );

    jouerNappeDerive(
        41.20,
        maintenant + dureeTotale * 0.32,
        dureeTotale * 0.55,
        0.018
    );

    // Le grondement sombre a été supprimé.
    // Il n'y a plus de "jouerGrondementSombre()".

    // ==========================================
    // MÉLODIE PRINCIPALE
    // ==========================================

    let motif = [
        329.63, // Mi
        261.63, // Do
        293.66, // Ré
        220.00  // La
    ];

    let melodie = [

        // ---- Phrase A ----
        { note: motif[0], debut: 1.5,  duree: 3.0 },
        { note: motif[1], debut: 5.0,  duree: 2.5 },
        { note: motif[2], debut: 8.0,  duree: 2.5 },
        { note: motif[3], debut: 11.0, duree: 3.5 },

        { note: 349.23, debut: 16.5, duree: 3.0 },
        { note: 392.00, debut: 20.0, duree: 2.5 },
        { note: 440.00, debut: 23.5, duree: 4.5 },

        // ---- Phrase B ----
        { note: 349.23, debut: 33.0, duree: 3.0 },
        { note: 293.66, debut: 37.5, duree: 3.0 },
        { note: 329.63, debut: 42.0, duree: 3.5 },

        // ---- Résolution ----
        { note: 293.66, debut: 48.5, duree: 2.5 },
        { note: 261.63, debut: 51.5, duree: 2.5 },
        { note: 246.94, debut: 54.5, duree: 3.5 },
        { note: 220.00, debut: 59.0, duree: 12.0 }
    ];

    for (let note of melodie) {

        jouerNote(
            note.note,
            maintenant + note.debut * vitesseLore,
            note.duree * vitesseLore,
            0.026,
            "triangle"
        );
    }

    // ==========================================
    // CONTRECHANT GRAVE
    // ==========================================

    let contrechant = [
        { note: 164.81, debut: 6.5,  duree: 4.0 },
        { note: 174.61, debut: 34.5, duree: 4.0 },
        { note: 146.83, debut: 60.5, duree: 8.0 }
    ];

    for (let note of contrechant) {

        jouerNote(
            note.note,
            maintenant + note.debut * vitesseLore,
            note.duree * vitesseLore,
            0.011,
            "sine"
        );
    }

    // ==========================================
    // PETITES CLOCHETTES
    // ==========================================

    jouerClocheEtrange(
        659.25,
        maintenant + 27 * vitesseLore,
        0.02
    );

    jouerClocheEtrange(
        587.33,
        maintenant + 55.5 * vitesseLore,
        0.02
    );

    jouerClocheEtrange(
        440.00,
        maintenant + 59.5 * vitesseLore,
        0.024
    );

    jouerClocheEtrange(
        659.25,
        maintenant + 61 * vitesseLore,
        0.02
    );

    // ==========================================
    // BOUCLE
    // ==========================================

    programmerBoucleMusique(function () {

        if (musiqueEnCours === "lore") {
            musiqueLore();
        }

    }, (dureeTotale - 3 * vitesseLore) * 1000);
}



// =========================
// DÉCLENCHEMENT DE LA FUSION
// =========================

function declencherFusion() {

    if (phaseFin === "fusion") return;

    let tempsFinalVictoire = Date.now() - debutChrono - tempsPauseAccumule;
    enregistrerVictoire(tempsFinalVictoire);

    tempsFusionElement.textContent = "Ton temps : " + formaterTemps(tempsFinalVictoire);

    phaseFin = "fusion";

    chronoActif = false;
    affichageChrono.style.display = "none";
    messageArene.style.display = "none";
    affichageScore.style.display = "none";
    murGaucheEcran.style.display = "none";

    arreterMusique();
    jouerMusiqueFusion();

    genererTachesSerpentDore();
    genererPuffsFumee();

    // 1. Le flash blanc monte, pendant qu'on voit encore les deux serpents collés
    flashFusion.style.opacity = "1";

    setTimeout(function () {

        jeuContainer.style.display = "none";
        finFusion.style.display = "flex";

        demarrerAnimationSerpentDore();

        texteFusionIntro.classList.add("visible");

    }, 700);

    setTimeout(function () {

        // 2. Le flash se dissipe : on retrouve le ciel et l'intro
        flashFusion.style.opacity = "0";

    }, 2700);

    setTimeout(function () {

        // 3. Le serpent doré est révélé sous la fumée qui se dissipe
        conteneurSerpentDore.classList.add("visible");
        debutFumee = Date.now();

    }, 3300);

       setTimeout(function () {

        // 4. Une fois la fumée dissipée, le texte de conclusion apparaît
        texteFusion.classList.add("visible");
        tempsFusionElement.classList.add("visible");

    }, 7700);

    setTimeout(function () {

        boutonMenuFusion.classList.add("visible");

    }, 9500);

}

// =========================
// SERPENT DORÉ FINAL
// =========================

function convertirCouleurEnRgb(couleurHex) {

    let temp = document.createElement("div");
    temp.style.color = couleurHex;
    document.body.appendChild(temp);
    let rgb = getComputedStyle(temp).color;
    document.body.removeChild(temp);

    let valeurs = rgb.match(/\d+/g).map(Number);

    return { r: valeurs[0], g: valeurs[1], b: valeurs[2] };

}

function genererTachesSerpentDore() {

    tachesSerpentDore = [];

    couleurBaseDoreeRgb = convertirCouleurEnRgb(couleurSerpent);

    let nombreSegments = 7;

    for (let i = 0; i < nombreSegments; i++) {

        let nombreFlaques = Math.random() < 0.5 ? 1 : 2;
        let flaques = [];

        for (let f = 0; f < nombreFlaques; f++) {

            let centreDx = (Math.random() - 0.5) * 24;
            let centreDy = (Math.random() - 0.5) * 16;

            let lobes = [];
            let nombreLobes = 3 + Math.floor(Math.random() * 3);

            for (let l = 0; l < nombreLobes; l++) {

                lobes.push({
                    dx: centreDx + (Math.random() - 0.5) * 12,
                    dy: centreDy + (Math.random() - 0.5) * 9,
                    rayonX: Math.random() * 5 + 4,
                    rayonY: Math.random() * 4 + 3,
                    rotation: Math.random() * Math.PI
                });

            }

            flaques.push(lobes);

        }

        tachesSerpentDore.push(flaques);

    }

}

function demarrerAnimationSerpentDore() {

    animationSerpentDoreActive = true;

    let debutAnimation = Date.now();

    function boucleSerpentDore() {

        if (!animationSerpentDoreActive) return;

        let temps = (Date.now() - debutAnimation) / 1000;

        dessinerSerpentDore(temps);

        if (debutFumee !== null) {

            let tempsFumee = (Date.now() - debutFumee) / 1000;
            dessinerFumee(tempsFumee);

        }

        requestAnimationFrame(boucleSerpentDore);

    }

    requestAnimationFrame(boucleSerpentDore);

}

function arreterAnimationSerpentDore() {

    animationSerpentDoreActive = false;
    debutFumee = null;

    ctxFumee.clearRect(0, 0, canvasFumee.width, canvasFumee.height);

}

function nuancerCouleur(rgb, facteur) {

    if (facteur >= 0) {
        return {
            r: Math.round(rgb.r + (255 - rgb.r) * facteur),
            g: Math.round(rgb.g + (255 - rgb.g) * facteur),
            b: Math.round(rgb.b + (255 - rgb.b) * facteur)
        };
    }

    let f = 1 + facteur;

    return {
        r: Math.round(rgb.r * f),
        g: Math.round(rgb.g * f),
        b: Math.round(rgb.b * f)
    };

}

function rgbVersChaine(rgb) {
    return "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
}

function dessinerFlaqueDoree(ctxCible, flaque, x, y, echelle) {

    for (let lobe of flaque) {

        let lx = x + lobe.dx * echelle;
        let ly = y + lobe.dy * echelle;
        let rx = Math.max(lobe.rayonX * echelle, 1.5);
        let ry = Math.max(lobe.rayonY * echelle, 1.5);

        // Halo externe, doux et diffus
        ctxCible.fillStyle = "rgba(160, 70, 230, 0.28)";
        ctxCible.beginPath();
        ctxCible.ellipse(lx, ly, rx * 1.5, ry * 1.5, lobe.rotation, 0, Math.PI * 2);
        ctxCible.fill();

        // Corps de la tache
        ctxCible.fillStyle = "rgba(130, 40, 200, 0.55)";
        ctxCible.beginPath();
        ctxCible.ellipse(lx, ly, rx, ry, lobe.rotation, 0, Math.PI * 2);
        ctxCible.fill();

        // Cœur plus sombre
        ctxCible.fillStyle = "rgba(95, 20, 160, 0.6)";
        ctxCible.beginPath();
        ctxCible.ellipse(lx, ly, rx * 0.55, ry * 0.55, lobe.rotation, 0, Math.PI * 2);
        ctxCible.fill();

    }

    // Petit reflet nacré sur la tache principale
    if (flaque.length > 0) {

        let centre = flaque[0];
        let hx = x + centre.dx * echelle - centre.rayonX * echelle * 0.3;
        let hy = y + centre.dy * echelle - centre.rayonY * echelle * 0.3;

        ctxCible.fillStyle = "rgba(230, 200, 255, 0.4)";
        ctxCible.beginPath();
        ctxCible.ellipse(hx, hy, 2 * echelle, 1.3 * echelle, -0.5, 0, Math.PI * 2);
        ctxCible.fill();

    }

}

function dessinerSerpentDore(temps) {

    let largeur = canvasSerpentDore.width;
    let hauteur = canvasSerpentDore.height;

    ctxSerpentDore.clearRect(0, 0, largeur, hauteur);

    let nombreSegments = tachesSerpentDore.length;
    let indexTete = nombreSegments - 1;
    let centreY = hauteur / 2;

    let LARGEUR_CORPS_BASE = 52;
    let HAUTEUR_CORPS_BASE = 44;
    let ECHELLE_MIN = 0.62;
    let ECHELLE_RANGE = 0.38;
    let LARGEUR_TETE = 56;
    let gapConstant = 5;

    function echellePour(i) {
        return ECHELLE_MIN + (i / indexTete) * ECHELLE_RANGE;
    }

    function largeurPour(i) {
        if (i === indexTete) return LARGEUR_TETE;
        return LARGEUR_CORPS_BASE * echellePour(i);
    }

    // ==== calcul des positions X avec un écart constant entre chaque segment ====

    let largeurs = [];
    for (let i = 0; i <= indexTete; i++) {
        largeurs.push(largeurPour(i));
    }

    let totalLargeur = largeurs.reduce(function (a, b) { return a + b; }, 0) + gapConstant * indexTete;

    let xActuel = largeur / 2 - totalLargeur / 2 + largeurs[0] / 2;
    let positionsX = [xActuel];

    for (let i = 1; i <= indexTete; i++) {
        xActuel += largeurs[i - 1] / 2 + gapConstant + largeurs[i] / 2;
        positionsX.push(xActuel);
    }

    let segments = [];
    for (let i = 0; i <= indexTete; i++) {
        segments.push({
            x: positionsX[i],
            y: centreY + Math.sin(temps * 1.1 + i * 0.55) * 9
        });
    }

    let sombre = nuancerCouleur(couleurBaseDoreeRgb, -0.5);
    let clair = nuancerCouleur(couleurBaseDoreeRgb, 0.6);
    let base = couleurBaseDoreeRgb;

    // ==== CORPS ====

    for (let i = 0; i < indexTete; i++) {

        let seg = segments[i];
        let echelle = echellePour(i);

        let largeurSeg = LARGEUR_CORPS_BASE * echelle;
        let hauteurSeg = HAUTEUR_CORPS_BASE * echelle;

        let position = (Math.sin(temps * 0.7 + i * 0.8) + 1) / 2;

        let degrade = ctxSerpentDore.createLinearGradient(
            seg.x - largeurSeg / 2, seg.y - hauteurSeg / 2,
            seg.x + largeurSeg / 2, seg.y + hauteurSeg / 2
        );

        degrade.addColorStop(0, rgbVersChaine(sombre));
        degrade.addColorStop(Math.max(0, position - 0.25), rgbVersChaine(base));
        degrade.addColorStop(position, rgbVersChaine(clair));
        degrade.addColorStop(Math.min(1, position + 0.25), rgbVersChaine(base));
        degrade.addColorStop(1, rgbVersChaine(sombre));

        ctxSerpentDore.save();
        ctxSerpentDore.shadowColor = "rgba(255, 225, 160, 0.5)";
        ctxSerpentDore.shadowBlur = 10;

        ctxSerpentDore.fillStyle = degrade;
        ctxSerpentDore.beginPath();
        ctxSerpentDore.roundRect(
            seg.x - largeurSeg / 2, seg.y - hauteurSeg / 2,
            largeurSeg, hauteurSeg, 13 * echelle
        );
        ctxSerpentDore.fill();
        ctxSerpentDore.restore();

        for (let flaque of tachesSerpentDore[i]) {
            dessinerFlaqueDoree(ctxSerpentDore, flaque, seg.x, seg.y, echelle);
        }

    }

    // ==== TÊTE ====

    let tete = segments[indexTete];

    let degradeTete = ctxSerpentDore.createLinearGradient(
        tete.x - 27, tete.y - 23, tete.x + 27, tete.y + 23
    );
    degradeTete.addColorStop(0, rgbVersChaine(sombre));
    degradeTete.addColorStop(0.45, rgbVersChaine(base));
    degradeTete.addColorStop(0.6, rgbVersChaine(clair));
    degradeTete.addColorStop(1, rgbVersChaine(base));

    ctxSerpentDore.save();
    ctxSerpentDore.shadowColor = "rgba(255, 230, 170, 0.75)";
    ctxSerpentDore.shadowBlur = 20;

    ctxSerpentDore.fillStyle = degradeTete;
    ctxSerpentDore.beginPath();
    ctxSerpentDore.roundRect(tete.x - 28, tete.y - 24, 56, 48, 19);
    ctxSerpentDore.fill();
    ctxSerpentDore.restore();

    if (tachesSerpentDore[indexTete] && tachesSerpentDore[indexTete][0]) {
        dessinerFlaqueDoree(ctxSerpentDore, tachesSerpentDore[indexTete][0], tete.x, tete.y, 0.55);
    }

    let oeil1X = tete.x + 8;
    let oeil1Y = tete.y - 10;
    let oeil2X = tete.x + 8;
    let oeil2Y = tete.y + 10;

    ctxSerpentDore.fillStyle = "white";
    ctxSerpentDore.beginPath();
    ctxSerpentDore.arc(oeil1X, oeil1Y, 6.5, 0, Math.PI * 2);
    ctxSerpentDore.fill();
    ctxSerpentDore.beginPath();
    ctxSerpentDore.arc(oeil2X, oeil2Y, 6.5, 0, Math.PI * 2);
    ctxSerpentDore.fill();

    ctxSerpentDore.fillStyle = "black";
    ctxSerpentDore.beginPath();
    ctxSerpentDore.arc(oeil1X + 2, oeil1Y, 2.8, 0, Math.PI * 2);
    ctxSerpentDore.fill();
    ctxSerpentDore.beginPath();
    ctxSerpentDore.arc(oeil2X + 2, oeil2Y, 2.8, 0, Math.PI * 2);
    ctxSerpentDore.fill();

    let langueBaseX = tete.x + 28;
    let langueY = tete.y;
    let langueOndulation = Math.sin(temps * 6) * 2;

    ctxSerpentDore.strokeStyle = "red";
    ctxSerpentDore.lineWidth = 3.5;
    ctxSerpentDore.lineCap = "round";

    ctxSerpentDore.beginPath();
    ctxSerpentDore.moveTo(langueBaseX, langueY);
    ctxSerpentDore.lineTo(langueBaseX + 18, langueY + langueOndulation);
    ctxSerpentDore.moveTo(langueBaseX + 18, langueY + langueOndulation);
    ctxSerpentDore.lineTo(langueBaseX + 26, langueY + langueOndulation - 6);
    ctxSerpentDore.moveTo(langueBaseX + 18, langueY + langueOndulation);
    ctxSerpentDore.lineTo(langueBaseX + 26, langueY + langueOndulation + 6);
    ctxSerpentDore.stroke();

    ctxSerpentDore.lineCap = "butt";

}

function genererPuffsFumee() {

    puffsFumee = [];

    let largeur = canvasFumee.width;
    let hauteur = canvasFumee.height;

    let nombrePuffs = 26;

    for (let i = 0; i < nombrePuffs; i++) {

        puffsFumee.push({
            x: 30 + Math.random() * (largeur - 60),
            y: hauteur / 2 + (Math.random() - 0.5) * 130,
            rayon: 55 + Math.random() * 70,
            decalage: Math.random() * 0.7,
            derive: (Math.random() - 0.5) * 40
        });

    }

}

function dessinerFumee(temps) {

    let largeur = canvasFumee.width;
    let hauteur = canvasFumee.height;

    ctxFumee.clearRect(0, 0, largeur, hauteur);

    let dureeFumee = 4.2;

    if (temps >= dureeFumee) {
        return;
    }

    for (let puff of puffsFumee) {

        let debutLocal = puff.decalage * 0.6;
        let progressionLocale = Math.min(Math.max((temps - debutLocal) / (dureeFumee - debutLocal), 0), 1);

        let opacite = (1 - progressionLocale) * 0.85;

        if (opacite <= 0) continue;

        let x = puff.x + puff.derive * progressionLocale;
        let y = puff.y - progressionLocale * 45;
        let rayon = puff.rayon * (0.85 + progressionLocale * 0.5);

        let degrade = ctxFumee.createRadialGradient(x, y, 0, x, y, rayon);
        degrade.addColorStop(0, "rgba(255,255,255," + opacite + ")");
        degrade.addColorStop(0.55, "rgba(240,240,245," + (opacite * 0.75) + ")");
        degrade.addColorStop(1, "rgba(240,240,245,0)");

        ctxFumee.fillStyle = degrade;
        ctxFumee.beginPath();
        ctxFumee.arc(x, y, rayon, 0, Math.PI * 2);
        ctxFumee.fill();

    }

}

// =========================
// RETOUR AU MENU DEPUIS LA FUSION
// =========================

boutonMenuFusion.addEventListener("click", function () {

    arreterAnimationSerpentDore();

    finFusion.style.display = "none";
    texteFusion.classList.remove("visible");
    tempsFusionElement.classList.remove("visible");
    texteFusionIntro.classList.remove("visible");
   conteneurSerpentDore.classList.remove("visible");
    boutonMenuFusion.classList.remove("visible");
    flashFusion.style.opacity = "0";

    jeuContainer.style.display = "none";
    menu.style.display = "flex";

    jeuCommence = false;
    jeuTermine = false;
    phaseFin = null;

    musiqueMenu();

});

// =========================
// BOUCLE
// =========================

function bouclePrincipale(tempsActuel) {


    if (dernierTemps === null) {
        dernierTemps = tempsActuel;
    }

    let delta = tempsActuel - dernierTemps;
    dernierTemps = tempsActuel;

    // Sécurité : évite un "rattrapage" brutal si l'onglet
    // a été mis en pause longtemps (mise en veille, changement d'onglet...)
    if (delta > 250) {
        delta = 250;
    }

if (jeuCommence && !jeuTermine && !enPause) {

       if (phaseFin === "cinematique") {

        avancerCinematique(delta);

    } else if (phaseFin === "arene") {

        accumulateurMouvement += delta;

        while (accumulateurMouvement >= vitesseArenePostCine) {
            bougerSerpentArene();
            accumulateurMouvement -= vitesseArenePostCine;
        }

    } else if (phaseFin === "fusion") {

        // Le jeu est figé : la scène finale prend le relais

    } else {

        accumulateurMouvement += delta;

        while (accumulateurMouvement >= vitesseActuelle) {
            bougerSerpent();
            accumulateurMouvement -= vitesseActuelle;
        }

    }

}

if (chronoActif && !enPause) {

    let ecoule = Date.now() - debutChrono - tempsPauseAccumule;
    affichageChrono.textContent = formaterTemps(ecoule);

}

    dessiner(delta);

    requestAnimationFrame(bouclePrincipale);

}

// =========================
// AFFICHAGE CONDITIONNEL DU BOUTON LORE
// =========================

function mettreAJourBoutonLore() {

    let progression = chargerProgression();

    boutonLore.style.display = progression.aDejaGagne ? "block" : "none";

    mettreAJourBlocSkinDore();

}

mettreAJourBoutonLore();

mettreAJourCouleurDoreeJoueur();
genererTachesSkinJoueur();

boutonLore.addEventListener("click", function () {

    menu.style.display = "none";

    lore.style.display = "flex";

    musiqueLore();

});

boutonRetourLore.addEventListener("click", function () {

    lore.style.display = "none";

    menu.style.display = "flex";

    musiqueMenu();

});

// =========================
// RENDU DU SKIN DORÉ EN JEU
// =========================

function mettreAJourCouleurDoreeJoueur() {
    couleurDoreeJoueurRgb = convertirCouleurEnRgb(couleurSerpent);
}



function genererTachesSkinJoueur() {

    tachesSkinJoueur = [];

    let nombreMotifs = 24;

       for (let i = 0; i < nombreMotifs; i++) {

        if (Math.random() < 0.15) {
            tachesSkinJoueur.push([]);
            continue;
        }

        let nombreFlaques = Math.random() < 0.5 ? 1 : 2;
        let flaques = [];

        for (let f = 0; f < nombreFlaques; f++) {

            let centreDx = (Math.random() - 0.5) * 24;
            let centreDy = (Math.random() - 0.5) * 16;

            let lobes = [];
            let nombreLobes = 3 + Math.floor(Math.random() * 3);

            for (let l = 0; l < nombreLobes; l++) {

                lobes.push({
                    dx: centreDx + (Math.random() - 0.5) * 12,
                    dy: centreDy + (Math.random() - 0.5) * 9,
                    rayonX: Math.random() * 5 + 4,
                    rayonY: Math.random() * 4 + 3,
                    rotation: Math.random() * Math.PI
                });

            }

            flaques.push(lobes);

        }

        tachesSkinJoueur.push(flaques);

    }

    tacheTeteJoueur = [[{
        dx: 0,
        dy: 0,
        rayonX: Math.random() * 5 + 4,
        rayonY: Math.random() * 4 + 3,
        rotation: Math.random() * Math.PI
    }]];

}

function dessinerSegmentDore(x, y, largeur, hauteur, indexMotif, motifForce) {

    let sombre = nuancerCouleur(couleurDoreeJoueurRgb, -0.55);
    let clair = nuancerCouleur(couleurDoreeJoueurRgb, 0.7);
    let base = couleurDoreeJoueurRgb;

    let position = (Math.sin(tempsPomme * 2 + indexMotif * 0.8) + 1) / 2;

    let degrade = ctx.createLinearGradient(x, y, x + largeur, y + hauteur);

    degrade.addColorStop(0, rgbVersChaine(sombre));
    degrade.addColorStop(Math.max(0, position - 0.22), rgbVersChaine(base));
    degrade.addColorStop(position, rgbVersChaine(clair));
    degrade.addColorStop(Math.min(1, position + 0.22), rgbVersChaine(base));
    degrade.addColorStop(1, rgbVersChaine(sombre));

    ctx.save();
    ctx.shadowColor = "rgba(255, 225, 160, 0.65)";
    ctx.shadowBlur = 12;

    ctx.fillStyle = degrade;
    ctx.beginPath();
    ctx.roundRect(x, y, largeur, hauteur, 12);
    ctx.fill();
    ctx.restore();

    let glint = (Math.sin(tempsPomme * 3.2 + indexMotif * 1.3) + 1) / 2;
    let glintX = x + largeur * glint;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, largeur, hauteur, 12);
    ctx.clip();

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(glintX, y + hauteur * 0.35, largeur * 0.18, hauteur * 0.6, -0.4, 0, Math.PI * 2);
    ctx.fill();

    let motif = motifForce || tachesSkinJoueur[indexMotif % (tachesSkinJoueur.length || 1)];

    if (motif) {

        for (let flaque of motif) {
            dessinerFlaqueDoree(ctx, flaque, x + largeur / 2, y + hauteur / 2, 0.5);
        }

    }

    ctx.restore();

}

function dessinerTroncSerpentDore(largeur) {

    if (serpent.length < 2) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (let seg of serpent) {

        let px = seg.x * taille + taille / 2;
        let py = seg.y * taille + taille / 2;

        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;

    }

    if (minX === maxX) { minX -= 1; maxX += 1; }
    if (minY === maxY) { minY -= 1; maxY += 1; }

    let sombre = nuancerCouleur(couleurDoreeJoueurRgb, -0.5);
    let clair = nuancerCouleur(couleurDoreeJoueurRgb, 0.65);
    let base = couleurDoreeJoueurRgb;

    let position = (Math.sin(tempsPomme * 1.3) + 1) / 2;

    let degrade = ctx.createLinearGradient(minX, minY, maxX, maxY);

    degrade.addColorStop(0, rgbVersChaine(sombre));
    degrade.addColorStop(Math.max(0, position - 0.3), rgbVersChaine(base));
    degrade.addColorStop(position, rgbVersChaine(clair));
    degrade.addColorStop(Math.min(1, position + 0.3), rgbVersChaine(base));
    degrade.addColorStop(1, rgbVersChaine(sombre));

    ctx.save();
    ctx.shadowColor = "rgba(255, 225, 160, 0.55)";
    ctx.shadowBlur = 14;

    dessinerTroncSerpent(largeur, degrade);

    ctx.restore();

    let rayonClip = largeur / 2 - 2;

    for (let i = 1; i < serpent.length; i++) {

        let seg = serpent[i];
        let cx = seg.x * taille + taille / 2;
        let cy = seg.y * taille + taille / 2;

        let motif = tachesSkinJoueur.length > 0
            ? tachesSkinJoueur[i % tachesSkinJoueur.length]
            : null;

        if (motif && motif.length > 0) {

            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, rayonClip, 0, Math.PI * 2);
            ctx.clip();

            for (let flaque of motif) {
                dessinerFlaqueDoree(ctx, flaque, cx, cy, 0.75);
            }

            ctx.restore();

        }

    }

}

// =========================
// AFFICHAGE ET GESTION DU SKIN DORÉ
// =========================

function mettreAJourBlocSkinDore() {

    let progression = chargerProgression();

    if (progression.aDejaGagne) {

        blocSkinDore.style.display = "block";
        caseSkinDore.checked = progression.skinDoreActif;
        skinDoreEnCours = progression.skinDoreActif;

    } else {

        blocSkinDore.style.display = "none";
        skinDoreEnCours = false;

    }

}

mettreAJourBlocSkinDore();

caseSkinDore.addEventListener("change", function () {

    let progression = chargerProgression();

    progression.skinDoreActif = caseSkinDore.checked;

    sauvegarderProgression(progression);

    skinDoreEnCours = caseSkinDore.checked;

    if (skinDoreEnCours) {
        mettreAJourCouleurDoreeJoueur();
        genererTachesSkinJoueur();
    }

});

let classement = document.getElementById("classement");
let podiumClassement = document.getElementById("podiumClassement");
let listeClassement = document.getElementById("listeClassement");
let boutonClassement = document.getElementById("boutonClassement");
let boutonRetourClassement = document.getElementById("boutonRetourClassement");

boutonClassement.addEventListener("click", function () {

    menu.style.display = "none";
    classement.style.display = "flex";

    chargerClassement();

});

boutonRetourClassement.addEventListener("click", function () {

    classement.style.display = "none";
    menu.style.display = "flex";

});

function echapperHtml(texte) {

    let div = document.createElement("div");
    div.textContent = texte;
    return div.innerHTML;

}

function chargerClassement() {

    podiumClassement.innerHTML = "<p class='chargementClassement'>Chargement...</p>";
    listeClassement.innerHTML = "";

    if (!db) {
        podiumClassement.innerHTML = "<p class='chargementClassement'>Classement indisponible.</p>";
        return;
    }

    db.collection("classement")
        .orderBy("temps", "asc")
        .limit(10)
        .get()
        .then(function (snapshot) {

            podiumClassement.innerHTML = "";
            listeClassement.innerHTML = "";

            if (snapshot.empty) {
                podiumClassement.innerHTML = "<p class='chargementClassement'>Aucun score enregistré pour l'instant.</p>";
                return;
            }

            let scores = [];

            snapshot.forEach(function (doc) {
                scores.push(doc.data());
            });

            afficherPodium(scores.slice(0, 3));
            afficherResteDuClassement(scores.slice(3), 4);

        })
        .catch(function (erreur) {

            podiumClassement.innerHTML = "<p class='chargementClassement'>Erreur lors du chargement.</p>";
            console.error(erreur);

        });

}

function afficherPodium(podium) {

    let ordreAffichage = [1, 0, 2]; // visuellement : 2e - 1er - 3e
    let medailles = ["🥇", "🥈", "🥉"];

    for (let position of ordreAffichage) {

        let joueur = podium[position];

        let carte = document.createElement("div");
        carte.className = "cartePodium position" + (position + 1);

        if (!joueur) {
            carte.classList.add("cartePodiumVide");
            podiumClassement.appendChild(carte);
            continue;
        }

      carte.innerHTML =
    "<div class='rangPodium'>" + (position + 1) + "</div>" +
    "<div class='medaillePodium'>" + medailles[position] + "</div>" +
    "<div class='pseudoPodium'>" + echapperHtml(joueur.pseudo) + "</div>" +
    "<div class='tempsPodium'>" + formaterTemps(joueur.temps) + "</div>";

        podiumClassement.appendChild(carte);

    }

}

function afficherResteDuClassement(reste, rangDepart) {

    listeClassement.innerHTML = "";

    for (let i = 0; i < reste.length; i++) {

        let joueur = reste[i];
        let ligne = document.createElement("li");

        ligne.innerHTML =
            "<span class='rangListe'>" + (rangDepart + i) + "</span>" +
            "<span class='pseudoListe'>" + echapperHtml(joueur.pseudo) + "</span>" +
            "<span class='tempsListe'>" + formaterTemps(joueur.temps) + "</span>";

        listeClassement.appendChild(ligne);

    }

}

// =========================
// MUSIQUE DU MENU AU CHARGEMENT
// =========================

musiqueMenu();

dessiner(0);

requestAnimationFrame(bouclePrincipale);