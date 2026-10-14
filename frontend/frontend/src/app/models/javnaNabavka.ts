export class StavkaNabavke {
    sifra: string = ""
    naziv: string = ""
    potkategorija: string = ""
    kolicina: number = 0
}

export class StavkaPonude {
    sifra: string = ""
    sifra_proizvoda: string = ""
    naziv_proizvoda: string = ""
    cena_po_komadu: number = 0
}

export class Ponuda {
    id_ponude: number = 0
    stampar: string = ""
    ukupna_cena: number = 0
    datum: Date = new Date()
    stavke: StavkaPonude[] = []
}

export class JavnaNabavka {
    id_nabavke: number = 0
    klijent: string = ""
    naziv_institucije: string = ""
    datum: Date = new Date()
    istice: Date = new Date()
    status: string = ""
    stavke: StavkaNabavke[] = []
    ponude: Ponuda[] = []
    pobednik: string = ""
    naziv_pobednika: string = ""
    iznos_pobednika: number = 0
}
