import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { KorisniciServis } from '../services/korisnici.servis';

@Component({
  selector: 'app-zaboravljena-lozinka',
  imports: [FormsModule, RouterLink],
  templateUrl: './zaboravljena-lozinka.html',
  styleUrl: './zaboravljena-lozinka.css',
})
export class ZaboravljenaLozinka {
  private korisniciServis = inject(KorisniciServis);

  kor_ime_ili_email = "";
  link = "";

  porukaGreske = "";
  porukaUspeha = "";

  posalji() {
    this.porukaUspeha = "";
    this.link = "";
    if (this.kor_ime_ili_email.trim() == "") {
      this.porukaGreske = "Unesite korisničko ime ili e-mail adresu.";
      return;
    }
    this.korisniciServis.zaboravljenaLozinka(this.kor_ime_ili_email.trim()).subscribe(podaci => {
      if (podaci == null) {
        this.porukaGreske = "Korisnik sa tim korisničkim imenom ili e-mail adresom ne postoji.";
        return;
      }
      this.porukaGreske = "";
      if (podaci.poslato == true) {
        this.porukaUspeha = "Link za postavljanje nove lozinke je poslat na e-mail adresu naloga. Link važi 5 minuta.";
      }
      else {
        this.porukaUspeha = "Link važi 5 minuta.";
        this.link = "/nova-lozinka/" + podaci.token;
      }
    })
  }

}
