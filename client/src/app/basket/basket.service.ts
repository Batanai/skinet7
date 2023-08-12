import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Basket, BasketItem, BasketTotals } from '../shared/models/basket';
import { HttpClient } from '@angular/common/http';
import { Product } from '../shared/models/product';

@Injectable({
  providedIn: 'root'
})
export class BasketService {
  baseUrl = environment.apiUrl;

  private basketSource = new BehaviorSubject<Basket | null>(null);
  basketSource$ = this.basketSource.asObservable();

  private basketTotalSource = new BehaviorSubject<BasketTotals | null>(null);
  basketTotalSource$ = this.basketTotalSource.asObservable();


  constructor(private http: HttpClient) { }

  getBasket(id: string){
    return this.http.get<Basket>(`${this.baseUrl}basket?id=${id}`).subscribe({
      next: basket => {
        this.basketSource.next(basket);
        this.calculateTotals()
      },
    })
  }

  setBasket(basket: Basket){
    return this.http.post<Basket>(`${this.baseUrl}basket`, basket).subscribe({
      next: basket => {
        this.basketSource.next(basket);
        this.calculateTotals();
      },
    })
  }

  getCurrentBasketValue(){
    return this.basketSource.value;
  }

  addItemToBasket(product: Product | BasketItem, quantity = 1){
    if(this.isProduct(product)) product = this.mapProductItemToBasketItem(product);
    const basket = this.getCurrentBasketValue() ?? this.createBasket();
    basket.items = this.addOrUpdateItem(basket.items, product, quantity);
    this.setBasket(basket);
  }

  removeItemFromBasket(id: number, quantity = 1){
    const basket = this.getCurrentBasketValue();
    if(!basket) return;

    const item = basket.items.find(item => item.id === id);
    if(item) {
      item.quantity -= quantity;
      if(item.quantity === 0){
        basket.items = basket.items.filter(item => item.id !== id);
      }
      if(basket.items.length > 0) this.setBasket(basket);
      else this.deleteBasket(basket);
    }
  }

  private deleteBasket(basket: Basket) {
    return this.http.delete<Basket>(`${this.baseUrl}basket?id=${basket.id}`).subscribe({
      next: () => {
        this.basketSource.next(null);
        this.basketTotalSource.next(null);
        localStorage.removeItem('basket_id');
      }
    })
  }

  private addOrUpdateItem(items: BasketItem[], productToAdd: BasketItem, quantity: number): BasketItem[] {
    const item = items.find(item => item.id === productToAdd.id);
    if(item) item.quantity += quantity;
    else {
      productToAdd.quantity = quantity;
      items.push(productToAdd);
    }

    return items;
  }

 private createBasket(): Basket {
    const basket = new Basket();
    localStorage.setItem('basket_id', basket.id);

    return basket;
  }

  private mapProductItemToBasketItem(product: Product) : BasketItem {
    return {
      id: product.id,
      productName: product.name,
      price: product.price,
      quantity: 0,
      pictureUrl: product.pictureUrl,
      brand: product.productBrand,
      type: product.productType
    }
  }

  private calculateTotals(){
    const basket = this.getCurrentBasketValue();
    if(!basket) return;
    
    const shipping = 0;
    const subtotal = basket.items.reduce((a, b) => (b.price * b.quantity) + a, 0);
    const total = subtotal + shipping;
    this.basketTotalSource.next({shipping, total, subtotal})
  }

  private isProduct(item: Product | BasketItem) : item is Product {
    return (item as Product).productBrand !== undefined;
  }
}
