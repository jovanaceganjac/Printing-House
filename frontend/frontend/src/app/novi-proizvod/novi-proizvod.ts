import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Korisnik } from '../models/korisnik';
import { KorisniciServis } from '../services/korisnici.servis';
import { ProizvodiServis } from '../services/proizvodi.servis';
import { KategorijeServis } from '../services/kategorije.servis';
import { API } from '../services/api';

@Component({
  selector: 'app-novi-proizvod',
  imports: [FormsModule, RouterLink],
  templateUrl: './novi-proizvod.html',
  styleUrl: './novi-proizvod.css',
})
export class NoviProizvod {
  private ruter = inject(Router);
  private korisniciServis = inject(KorisniciServis);
  private proizvodiServis = inject(ProizvodiServis);
  private kategorijeServis = inject(KategorijeServis);

  api = API;
  korisnik: Korisnik = new Korisnik();

  kategorije: any[] = [];
  potkategorije: string[] = [];

  noviNaziv = "";
  noviOpis = "";
  novaKategorija = "";
  novaPotkategorija = "";
  novaCena = 0;
  novaKolicina = 0;
  noveBoje = "";
  usluge: any[] = [];
  glavnaSlikaPutanja = "";
  dodatneSlikePutanje: string[] = [];
  porukaGreske = "";
  porukaUspeha = "";

  ngOnInit(): void {
    const sacuvan = localStorage.getItem("korisnik");
    if (sacuvan == null) {
      this.ruter.navigate([""]);
      return;
    }
    const prijavljen = JSON.parse(sacuvan);
    if (prijavljen.tip != "stampar") {
      this.ruter.navigate([""]);
      return;
    }

    this.korisniciServis.dohvatiKorisnika(prijavljen.kor_ime).subscribe(podaci => {
      if (podaci == null) {
        return;
      }
      this.korisnik = podaci;
    })

    this.kategorijeServis.dohvatiSveKategorije().subscribe(podaci => {
      this.kategorije = podaci;
    })
  }

  promeniKategoriju() {
    this.novaPotkategorija = "";
    const izabrana = this.kategorije.find(k => k.naziv == this.novaKategorija);
    if (izabrana == null) {
      this.potkategorije = [];
    }
    else {
      this.potkategorije = izabrana.potkategorije;
    }
  }

  dodajUslugu() {
    this.usluge.push({ tip_stampe: "", dodatna_cena_po_komadu: 0, max_sirina_mm: 0, max_visina_mm: 0 });
  }

  ukloniUslugu(i: number) {
    this.usluge.splice(i, 1);
  }

  izaberiGlavnuSliku(dogadjaj: any) {
    if (dogadjaj.target.files.length == 0) {
      return;
    }
    this.proizvodiServis.upload(dogadjaj.target.files[0]).subscribe(podaci => {
      if (podaci == null) {
        this.porukaGreske = "Dozvoljeni formati slike su JPG, PNG i GIF, najviše 5 MB.";
      }
      else {
        this.porukaGreske = "";
        this.glavnaSlikaPutanja = podaci.putanja;
      }
    })
  }

  izaberiDodatnuSliku(dogadjaj: any) {
    if (dogadjaj.target.files.length == 0) {
      return;
    }
    if (this.dodatneSlikePutanje.length >= 3) {
      this.porukaGreske = "Dozvoljene su najviše 3 dodatne slike.";
      return;
    }
    this.proizvodiServis.upload(dogadjaj.target.files[0]).subscribe(podaci => {
      if (podaci == null) {
        this.porukaGreske = "Dozvoljeni formati slike su JPG, PNG i GIF, najviše 5 MB.";
      }
      else {
        this.porukaGreske = "";
        this.dodatneSlikePutanje.push(podaci.putanja);
      }
    })
  }

  ukloniDodatnu(i: number) {
    this.dodatneSlikePutanje.splice(i, 1);
  }

  dodajProizvod() {
    this.porukaUspeha = "";

    if (this.noviNaziv == "") {
      this.porukaGreske = "Naziv proizvoda je obavezan.";
      return;
    }
    if (this.novaKategorija == "" || this.novaPotkategorija == "") {
      this.porukaGreske = "Izaberite kategoriju i potkategoriju.";
      return;
    }
    if (isNaN(Number(this.novaCena)) || Number(this.novaCena) <= 0) {
      this.porukaGreske = "Jedinična cena mora biti veća od nule.";
      return;
    }
    if (isNaN(Number(this.novaKolicina)) || Number(this.novaKolicina) < 0) {
      this.porukaGreske = "Količina na lageru ne sme biti negativna.";
      return;
    }
    if (this.glavnaSlikaPutanja == "") {
      this.porukaGreske = "Glavna slika proizvoda je obavezna.";
      return;
    }
    if (this.dodatneSlikePutanje.length > 3) {
      this.porukaGreske = "Dozvoljene su najviše 3 dodatne slike.";
      return;
    }
    for (let i = 0; i < this.usluge.length; i++) {
      if (this.usluge[i].tip_stampe == "") {
        this.porukaGreske = "Tip štampe ne sme biti prazan.";
        return;
      }
      if (isNaN(Number(this.usluge[i].dodatna_cena_po_komadu)) || Number(this.usluge[i].dodatna_cena_po_komadu) < 0) {
        this.porukaGreske = "Dodatna cena po komadu ne sme biti negativna.";
        return;
      }
      if (isNaN(Number(this.usluge[i].max_sirina_mm)) || Number(this.usluge[i].max_sirina_mm) <= 0) {
        this.porukaGreske = "Maksimalna širina mora biti veća od nule.";
        return;
      }
      if (isNaN(Number(this.usluge[i].max_visina_mm)) || Number(this.usluge[i].max_visina_mm) <= 0) {
        this.porukaGreske = "Maksimalna visina mora biti veća od nule.";
        return;
      }
    }

    const boje = this.noveBoje.split(",").map(b => b.trim()).filter(b => b != "");

    const telo = {
      kor_ime: this.korisnik.kor_ime,
      naziv: this.noviNaziv,
      opis: this.noviOpis,
      kategorija: this.novaKategorija,
      potkategorija: this.novaPotkategorija,
      jedinicna_cena: Number(this.novaCena),
      kolicina_na_lageru: Number(this.novaKolicina),
      dostupne_boje: boje,
      slika: this.glavnaSlikaPutanja,
      dodatne_slike: this.dodatneSlikePutanje,
      usluge_stampe: this.usluge
    }

    this.proizvodiServis.dodajProizvod(telo).subscribe({
      next: () => {
        this.isprazniFormu();
        this.porukaGreske = "";
        this.porukaUspeha = "Proizvod je dodat.";
        this.ngOnInit();
      },
      error: () => {
        this.porukaGreske = "Dodavanje proizvoda nije uspelo.";
      }
    })
  }

  isprazniFormu() {
    this.noviNaziv = "";
    this.noviOpis = "";
    this.novaKategorija = "";
    this.novaPotkategorija = "";
    this.potkategorije = [];
    this.novaCena = 0;
    this.novaKolicina = 0;
    this.noveBoje = "";
    this.usluge = [];
    this.glavnaSlikaPutanja = "";
    this.dodatneSlikePutanje = [];
  }

}
