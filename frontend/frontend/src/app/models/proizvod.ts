export class UslugaStampe {
    id_usluge: number = 0
    tip_stampe: string = ""
    dodatna_cena_po_komadu: number = 0
    max_sirina_mm: number = 0
    max_visina_mm: number = 0
}

export class Ocena {
    kor_ime: string = ""
    vrednost: number = 0
    datum: Date = new Date()
}

export class Komentar {
    id_komentara: number = 0
    kor_ime: string = ""
    datum: Date = new Date()
    tekst: string = ""
}

export class Proizvod {
    sifra: string = ""
    naziv: string = ""
    opis: string = ""
    kategorija: string = ""
    potkategorija: string = ""
    jedinicna_cena: number = 0
    kolicina_na_lageru: number = 0
    dostupne_boje: string[] = []
    slika: string = ""
    dodatne_slike: string[] = []
    stampar: string = ""
    grad: string = ""
    naziv_stamparije: string = ""
    usluge_stampe: UslugaStampe[] = []
    broj_svidjanja: number = 0
    broj_nesvidjanja: number = 0
    ocene: Ocena[] = []
    komentari: Komentar[] = []
}
