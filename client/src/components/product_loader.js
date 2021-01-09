import * as R from 'ramda'
import * as L from 'partial.lenses'

import { Component } from 'react'
import { connect } from 'react-redux'

import { httpGetPromise } from '../utils'

import {
  selectedSiteIdL,
  selectedProductIdL,
  selectedFlavorIdL,
  selectedFlavorL
} from '../state_reduction'
import { ObserverActions } from '../constants'
import { loadProducts } from '../product_loading'


class ProductLoader extends Component {
  constructor() {
    super()
    this.loadedProducts = {}
    this.loadingProducts = {}

    this.siteProductFlavorKey = [null, null, null]
  }

  componentDidMount() {
    this.props.setProductRepositoryObject(this.loadedProducts)
  }

  shouldComponentUpdate(nextProps) {
    const lenses = [selectedSiteIdL, selectedProductIdL, selectedFlavorIdL]
    const current = R.map((lens) => L.get(lens, this.props), lenses)
    const next = R.map((lens) => L.get(lens, nextProps), lenses)
    return !R.equals(current, next)
  }

  render() {
    const load = (dispatch, state, productUrlResolver, loadedProducts, loadingProducts) => {
      if (dispatch == null ||
	  L.get(selectedSiteIdL, state) == null ||
	  L.get(selectedProductIdL, state) == null ||
	  L.get(selectedFlavorIdL, state) == null) {
	return
      }

      loadProducts(
	dispatch,
	productUrlResolver,
	loadedProducts,
	loadingProducts,
	L.get(selectedFlavorL, state)
      ).then((shouldLoadMoreProducts) => {
	if (shouldLoadMoreProducts) {
	  setTimeout(() => load(
	    dispatch,
	    state,
	    productUrlResolver,
	    loadedProducts,
	    loadingProducts
	  ), 500)
	}
      })
    }

    const props = this.props
    load(
      props.dispatch,
      props,
      props.productUrlResolver,
      this.loadedProducts,
      this.loadingProducts
    )

    return null
  }
}


const mapStateToProps = (state) => {
  const result = [
    selectedSiteIdL,
    selectedProductIdL,
    selectedFlavorIdL,
    selectedFlavorL,
  ].reduce(
    (acc, lens) => L.set(lens, L.get(lens, state), acc),
    {}
  )

  return result
}
export default connect(mapStateToProps)(ProductLoader)
