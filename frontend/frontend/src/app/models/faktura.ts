export class Stavka {
    id_stavke: number = 0
    sifra: string = ""
    naziv: string = ""
    kolicina: number = 0
    boja: string = ""
    tip_stampe: string = ""
    cena_po_komadu: number = 0
    ukupno: number = 0
    tekst_stampe: string = ""
    slika_stampe: string = ""
}

export class StavkaKorpe {
    sifra: string = ""
    naziv: string = ""
    stampar: string = ""
    naziv_stamparije: string = ""
    grad: string = ""
    boja: string = ""
    tip_stampe: string = ""
    cena_po_komadu: number = 0
    kolicina: number = 0
    ukupno: number = 0
    tekst_stampe: string = ""
    slika_stampe: string = ""
}

export class Faktura {
    id_fakture: number = 0
    klijent: string = ""
    stampar: string = ""
    naziv_stamparije: string = ""
    grad: string = ""
    datum: Date = new Date()
    status: string = ""
    ukupan_iznos: number = 0
    stavke: Stavka[] = []
}
