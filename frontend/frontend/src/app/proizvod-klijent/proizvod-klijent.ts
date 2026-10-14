import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Proizvod } from '../models/proizvod';
import { ProizvodiServis } from '../services/proizvodi.servis';
import { KorisniciServis } from '../services/korisnici.servis';
import { API } from '../services/api';

@Component({
  selector: 'app-proizvod-klijent',
  imports: [FormsModule],
  templateUrl: './proizvod-klijent.html',
  styleUrl: './proizvod-klijent.css',
})
export class ProizvodKlijent {
  private proizvodiServis = inject(ProizvodiServis);
  private korisniciServis = inject(KorisniciServis);
  private ruter = inject(Router);
  private ruta = inject(ActivatedRoute);
  private cistac = inject(DomSanitizer);

  api = API;
  sifra = "";
  proizvod: Proizvod = new Proizvod();
  glavnaSlika = "";
  boje: string[] = [];
  izabranaBoja = "";
  mapa: SafeResourceUrl | null = null;
  adresaStamparije = "";
  kor_ime = "";

  sveSlike() {
    return [this.proizvod.slika].concat(this.proizvod.dodatne_slike).filter(s => s != null && s != "");
  }

  poslednjiKomentari() {
    return this.proizvod.komentari.slice(-5).reverse();
  }

  formatDatum(d: any) {
    return new Date(d).toLocaleDateString("sr-RS");
  }

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

    this.sifra = this.ruta.snapshot.paramMap.get("sifra")!;
    this.proizvodiServis.dohvatiProizvod(this.sifra).subscribe(podaci => {
      if (podaci == null) {
        return;
      }
      this.proizvod = podaci;

      const dozvoljene = this.sveSlike();
      const zapamcena = this.procitajKolacic("glavna_slika_" + this.sifra);
      if (zapamcena != "" && dozvoljene.indexOf(zapamcena) >= 0) {
        this.glavnaSlika = zapamcena;
      }
      else {
        this.glavnaSlika = dozvoljene.length > 0 ? dozvoljene[0] : "";
      }

      if (podaci.dostupne_boje.length == 0) {
        this.boje = ["Bela"];
      }
      else {
        this.boje = podaci.dostupne_boje;
      }
      this.izabranaBoja = this.boje[0];

      this.korisniciServis.dohvatiKorisnika(podaci.stampar).subscribe(podaci2 => {
        if (podaci2 == null) {
          return;
        }
        this.adresaStamparije = podaci2.adresa_sedista;
        if (!podaci2.lat || !podaci2.lon) {
          return;
        }
        const lat = Number(podaci2.lat);
        const lon = Number(podaci2.lon);
        const adresa = "https://www.openstreetmap.org/export/embed.html?bbox=" +
          (lon - 0.01) + "," + (lat - 0.01) + "," + (lon + 0.01) + "," + (lat + 0.01) +
          "&layer=mapnik&marker=" + lat + "," + lon;
        this.mapa = this.cistac.bypassSecurityTrustResourceUrl(adresa);
      })
    })
  }

  postaviGlavnu(slika: string) {
    this.glavnaSlika = slika;
    this.upisiKolacic("glavna_slika_" + this.proizvod.sifra, slika, 7);
  }

  procitajKolacic(kljuc: string) {
    const delovi = document.cookie.split(";");
    for (let i = 0; i < delovi.length; i++) {
      const deo = delovi[i].trim();
      if (deo.indexOf(kljuc + "=") == 0) {
        return decodeURIComponent(deo.substring(kljuc.length + 1));
      }
    }
    return "";
  }

  upisiKolacic(kljuc: string, vrednost: string, dana: number) {
    const istek = new Date(Date.now() + dana * 24 * 60 * 60 * 1000);
    document.cookie = kljuc + "=" + encodeURIComponent(vrednost) + "; expires=" + istek.toUTCString() + "; path=/";
  }

  dalje() {
    this.ruter.navigate(["priprema", this.sifra], { queryParams: { boja: this.izabranaBoja } });
  }

  nazad() {
    this.ruter.navigate(["klijent"]);
  }

}
