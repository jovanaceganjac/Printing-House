import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Korisnik } from '../models/korisnik';
import { Proizvod } from '../models/proizvod';
import { JavnaNabavka } from '../models/javnaNabavka';
import { KorisniciServis } from '../services/korisnici.servis';
import { ProizvodiServis } from '../services/proizvodi.servis';
import { NabavkeServis } from '../services/nabavke.servis';

@Component({
  selector: 'app-licitacije',
  imports: [FormsModule, RouterLink],
  templateUrl: './licitacije.html',
  styleUrl: './licitacije.css',
})
export class Licitacije {
  private ruter = inject(Router);
  private korisniciServis = inject(KorisniciServis);
  private proizvodiServis = inject(ProizvodiServis);
  private nabavkeServis = inject(NabavkeServis);

  korisnik: Korisnik = new Korisnik();
  proizvodi: Proizvod[] = [];

  nabavke: JavnaNabavka[] = [];
  ponudeCene: any = {};
  ponudeProizvodi: any = {};
  porukaNabavke = "";
  porukaNabavkeUspeh = "";

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

    this.proizvodiServis.dohvatiProizvodeStampara(prijavljen.kor_ime).subscribe(podaci => {
      this.proizvodi = podaci;
    })

    this.nabavkeServis.dohvatiOtvorene().subscribe(podaci => {
      this.nabavke = podaci;
      this.ponudeCene = {};
      this.ponudeProizvodi = {};
    })
  }

  mojiUPotkategoriji(st: any) {
    return this.proizvodi.filter(p => st.potkategorija == "" || st.potkategorija == null || p.potkategorija == st.potkategorija);
  }

  izabraniZaPonudu(n: JavnaNabavka, st: any) {
    const sifra = this.ponudeProizvodi[this.kljucCene(n, st.sifra)];
    return this.proizvodi.find(p => p.sifra == sifra);
  }

  nemaDovoljno(n: JavnaNabavka, st: any) {
    const izabran = this.izabraniZaPonudu(n, st);
    return izabran != null && Number(izabran.kolicina_na_lageru) < Number(st.kolicina);
  }

  mozePonudu(n: JavnaNabavka) {
    return n.stavke.every(st => this.mojiUPotkategoriji(st).length > 0);
  }

  formatVreme(d: any) {
    return new Date(d).toLocaleString("sr-RS");
  }

  trazeniProizvodi(n: JavnaNabavka) {
    return n.stavke.map((s, i) => (i + 1) + ". " + s.naziv + " (" + s.kolicina + ")").join(", ");
  }

  imaPonudu(n: JavnaNabavka) {
    return n.ponude.some(p => p.stampar == this.korisnik.kor_ime);
  }

  kljucCene(n: JavnaNabavka, sifra: string) {
    return n.id_nabavke + "_" + sifra;
  }

  ukupnaPonuda(n: JavnaNabavka) {
    let zbir = 0;
    for (let i = 0; i < n.stavke.length; i++) {
      const cena = Number(this.ponudeCene[this.kljucCene(n, n.stavke[i].sifra)]);
      if (isNaN(cena) == false) {
        zbir = zbir + cena * Number(n.stavke[i].kolicina);
      }
    }
    return zbir;
  }

  posaljiPonudu(n: JavnaNabavka) {
    let stavke: any[] = [];

    this.porukaNabavkeUspeh = "";

    for (let i = 0; i < n.stavke.length; i++) {
      const kljuc = this.kljucCene(n, n.stavke[i].sifra);
      const sifraProizvoda = this.ponudeProizvodi[kljuc];
      if (sifraProizvoda == null || sifraProizvoda == "") {
        this.porukaNabavke = "Za svaku traženu stavku izaberite svoj proizvod iz iste potkategorije.";
        return;
      }
      const cena = Number(this.ponudeCene[kljuc]);
      if (this.ponudeCene[kljuc] == null || isNaN(cena) || cena <= 0) {
        this.porukaNabavke = "Unesite cenu veću od nule za svaki traženi proizvod.";
        return;
      }
      stavke.push({ sifra: n.stavke[i].sifra, sifra_proizvoda: sifraProizvoda, cena_po_komadu: cena });
    }

    this.nabavkeServis.posaljiPonudu(n.id_nabavke, this.korisnik.kor_ime, stavke).subscribe({
      next: () => {
        this.porukaNabavke = "";
        this.porukaNabavkeUspeh = "Ponuda za nabavku br. " + n.id_nabavke + " je poslata.";
        this.ngOnInit();
      },
      error: () => {
        this.porukaNabavke = "Ponuda nije poslata. Možda je licitacija istekla ili ste već poslali ponudu.";
      }
    })
  }

}
