import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { KorisniciServis } from '../services/korisnici.servis';

@Component({
  selector: 'app-admin-prijava',
  imports: [FormsModule],
  templateUrl: './admin-prijava.html',
  styleUrl: './admin-prijava.css',
})
export class AdminPrijava {
  private korisniciServis = inject(KorisniciServis);
  private ruter = inject(Router);

  kor_ime = "";
  lozinka = "";

  porukaGreske = "";

  prijava() {
    if (this.kor_ime == "" || this.lozinka == "") {
      this.porukaGreske = "Unesite korisničko ime i lozinku.";
      return;
    }
    this.korisniciServis.prijava(this.kor_ime, this.lozinka).subscribe(podaci => {
      if (podaci == null) {
        this.porukaGreske = "Pogrešno korisničko ime ili lozinka.";
      }
      else if (podaci.kor_ime == null) {
        this.porukaGreske = "Vaš nalog još nije odobren od strane administratora.";
      }
      else if (podaci.tip != "admin") {
        this.porukaGreske = "Pogrešno korisničko ime ili lozinka.";
      }
      else {
        this.porukaGreske = "";
        localStorage.setItem("korisnik", JSON.stringify(podaci));
        this.ruter.navigate(["/administrator"]);
      }
    })
  }

}
