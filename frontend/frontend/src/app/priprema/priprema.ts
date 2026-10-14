import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Proizvod } from '../models/proizvod';
import { StavkaKorpe } from '../models/faktura';
import { ProizvodiServis } from '../services/proizvodi.servis';
import { KorpaServis } from '../services/korpa.servis';
import { API } from '../services/api';

@Component({
  selector: 'app-priprema',
  imports: [FormsModule],
  templateUrl: './priprema.html',
  styleUrl: './priprema.css',
})
export class Priprema {
  private proizvodiServis = inject(ProizvodiServis);
  private korpaServis = inject(KorpaServis);
  private ruter = inject(Router);
  private ruta = inject(ActivatedRoute);

  api = API;
  sifra = "";
  kor_ime = "";
  tip = "";
  proizvod: Proizvod = new Proizvod();
  boje: string[] = [];

  izabranaBoja = "";
  pocetnaBoja = "";
  izabranaUsluga = "";
  tekstStampe = "";
  slikaStampe = "";
  kolicina = 1;

  porukaGreske = "";

  ngOnInit(): void {
    const sacuvan = localStorage.getItem("korisnik");
    if (sacuvan == null) {
      this.ruter.navigate([""]);
      return;
    }
    const prijavljen = JSON.parse(sacuvan);
    if (String(prijavljen.tip).startsWith("klijent") == false) {
      this.ruter.navigate([""]);
      return;
    }
    this.kor_ime = prijavljen.kor_ime;
    this.tip = prijavljen.tip;

    this.sifra = this.ruta.snapshot.paramMap.get("sifra")!;
    const bojaSaDetalja = this.ruta.snapshot.queryParamMap.get("boja");
    this.proizvodiServis.dohvatiProizvod(this.sifra).subscribe(podaci => {
      if (podaci == null) {
        return;
      }
      this.proizvod = podaci;
      if (podaci.dostupne_boje.length == 0) {
        this.boje = ["Bela"];
      }
      else {
        this.boje = podaci.dostupne_boje;
      }
      this.pocetnaBoja = (bojaSaDetalja != null && this.boje.indexOf(bojaSaDetalja) >= 0) ? bojaSaDetalja : this.boje[0];
      this.izabranaBoja = this.pocetnaBoja;
    })
  }

  cenaPoKomadu() {
    const usluga = this.proizvod.usluge_stampe.find(u => u.tip_stampe == this.izabranaUsluga);
    if (usluga == null) {
      return Number(this.proizvod.jedinicna_cena);
    }
    return Number(this.proizvod.jedinicna_cena) + Number(usluga.dodatna_cena_po_komadu);
  }

  izabranaUslugaPodaci() {
    const usluga = this.proizvod.usluge_stampe.find(u => u.tip_stampe == this.izabranaUsluga);
    return usluga == null ? null : usluga;
  }

  ukupno() {
    return this.cenaPoKomadu() * Number(this.kolicina);
  }

  izaberiSlicicu(dogadjaj: any) {
    if (dogadjaj.target.files.length == 0) {
      return;
    }
    if (/\.(jpe?g|png|gif)$/i.test(dogadjaj.target.files[0].name) == false) {
      this.porukaGreske = "Sličica mora biti u JPG, PNG ili GIF formatu.";
      dogadjaj.target.value = "";
      return;
    }
    this.proizvodiServis.upload(dogadjaj.target.files[0]).subscribe(podaci => {
      if (podaci == null) {
        this.porukaGreske = "Dozvoljeni formati slike su JPG, PNG i GIF, najviše 5 MB.";
      }
      else {
        this.porukaGreske = "";
        this.slikaStampe = podaci.putanja;
      }
    })
  }

  dodajUKorpu() {
    if (this.izabranaUsluga == "" && this.tip != "klijent_pravno") {
      this.porukaGreske = "Izaberite vrstu štampe.";
      return;
    }
    if (isNaN(Number(this.kolicina)) || Number(this.kolicina) < 1 || Number.isInteger(Number(this.kolicina)) == false) {
      this.porukaGreske = "Količina mora biti ceo broj, najmanje 1.";
      return;
    }

    let vecUKorpi = 0;
    const korpa = this.korpaServis.dohvatiKorpu(this.kor_ime);
    for (let i = 0; i < korpa.length; i++) {
      if (korpa[i].sifra == this.proizvod.sifra) {
        vecUKorpi = vecUKorpi + Number(korpa[i].kolicina);
      }
    }

    if (Number(this.kolicina) + vecUKorpi > Number(this.proizvod.kolicina_na_lageru)) {
      this.porukaGreske = "Nema dovoljno proizvoda trenutno na stanju";
      return;
    }

    const stavka = new StavkaKorpe();
    stavka.sifra = this.proizvod.sifra;
    stavka.naziv = this.proizvod.naziv;
    stavka.stampar = this.proizvod.stampar;
    stavka.naziv_stamparije = this.proizvod.naziv_stamparije;
    stavka.grad = this.proizvod.grad;
    stavka.boja = this.izabranaBoja;
    stavka.tip_stampe = this.izabranaUsluga;
    stavka.cena_po_komadu = this.cenaPoKomadu();
    stavka.kolicina = Number(this.kolicina);
    stavka.ukupno = this.ukupno();
    stavka.tekst_stampe = this.tekstStampe;
    stavka.slika_stampe = this.slikaStampe;

    this.korpaServis.dodajUKorpu(this.kor_ime, stavka);
    this.ruter.navigate(["korpa"]);
  }

  ponisti() {
    this.izabranaUsluga = "";
    this.izabranaBoja = this.pocetnaBoja;
    this.tekstStampe = "";
    this.slikaStampe = "";
    this.kolicina = 1;
    this.porukaGreske = "";
  }

  nazad() {
    this.ruter.navigate(["proizvod-klijent", this.sifra]);
  }

}
