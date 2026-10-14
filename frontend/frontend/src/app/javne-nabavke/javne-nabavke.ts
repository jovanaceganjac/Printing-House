import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { JavnaNabavka } from '../models/javnaNabavka';
import { NabavkeServis } from '../services/nabavke.servis';

@Component({
  selector: 'app-javne-nabavke',
  imports: [RouterLink],
  templateUrl: './javne-nabavke.html',
  styleUrl: './javne-nabavke.css',
})
export class JavneNabavke {
  private ruter = inject(Router);
  private nabavkeServis = inject(NabavkeServis);

  kor_ime = "";
  nabavke: JavnaNabavka[] = [];

  nazivStatusa(status: string) {
    const nazivi: any = {
      "naruceno": "naručeno", "placeno": "plaćeno", "u stampi": "u štampi", "isporuceno": "isporučeno", "primljeno": "primljeno",
      "otvorena": "otvorena", "zakljucena": "zaključena", "na cekanju": "na čekanju", "odobren": "odobren", "odbijen": "odbijen"
    };
    return nazivi[status] ? nazivi[status] : status;
  }

  ngOnInit(): void {
    const sacuvan = localStorage.getItem("korisnik");
    if (sacuvan == null) {
      this.ruter.navigate([""]);
      return;
    }
    const prijavljen = JSON.parse(sacuvan);
    if (prijavljen.tip != "klijent_pravno") {
      this.ruter.navigate([""]);
      return;
    }
    this.kor_ime = prijavljen.kor_ime;

    this.nabavkeServis.dohvatiNabavkeKlijenta(prijavljen.kor_ime).subscribe(podaci => {
      this.nabavke = podaci;
    })
  }

  putanjaIzvestaja(n: JavnaNabavka) {
    return this.nabavkeServis.putanjaIzvestaja(n.id_nabavke);
  }

  trazeniProizvodi(n: JavnaNabavka) {
    return n.stavke.map((s, i) => (i + 1) + ". " + s.naziv + " (" + s.kolicina + ")").join(", ");
  }

  formatVreme(d: any) {
    return new Date(d).toLocaleString("sr-RS");
  }

  osvezi() {
    this.ngOnInit();
  }

}
