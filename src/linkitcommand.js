/**
 * @module linkit/linkcommand
 */

import Command from '@ckeditor/ckeditor5-core/src/command';
import findLinkRange from '@ckeditor/ckeditor5-link/src/findlinkrange';
import toMap from '@ckeditor/ckeditor5-utils/src/tomap';

/**
 * The link command. It is used by the {@link module:link/link~Link link feature}.
 *
 * @extends module:core/command~Command
 */
export default class LinkitCommand extends Command {
	/**
   * The value of the `'linkHref'` attribute if the start of the selection is located in a node with this attribute.
   *
   * @observable
   * @readonly
   * @member {Object|undefined} #value
   */

	/**
   * @inheritDoc
   */
	refresh() {
		const model = this.editor.model;
		const doc = model.document;

		this.attributes = doc.selection.getAttributes();
		this.value = doc.selection.getAttribute( 'linkHref' );
		this.isEnabled = model.schema.checkAttributeInSelection( doc.selection, 'linkHref' );
	}

	/**
   * Executes the command.
   *
   * When the selection is non-collapsed, the `linkHref` attribute will be applied to nodes inside the selection, but only to
   * those nodes where the `linkHref` attribute is allowed (disallowed nodes will be omitted).
   *
   * When the selection is collapsed and is not inside the text with the `linkHref` attribute, the
   * new {@link module:engine/model/text~Text Text node} with the `linkHref` attribute will be inserted in place of caret, but
   * only if such element is allowed in this place. The `_data` of the inserted text will equal the `href` parameter.
   * The selection will be updated to wrap the just inserted text node.
   *
   * When the selection is collapsed and inside the text with the `linkHref` attribute, the attribute value will be updated.
   *
   * @fires execute
   * @param {String} href Link destination.
   */
	execute( attrs ) {
		const model = this.editor.model;
		const selection = model.document.selection;

		model.change( writer => {
			// If selection is collapsed then update selected link or insert new one at the place of caret.
			if ( selection.isCollapsed ) {
				const position = selection.getFirstPosition();

				// When selection is inside text with `linkHref` attribute.
				if ( selection.hasAttribute( 'linkHref' ) ) {
					// Then update `linkHref` value.
					const linkRange = findLinkRange( selection.getFirstPosition(), selection.getAttribute( 'linkHref' ), model );
					writer.setAttribute( 'linkHref', attrs.href, linkRange );

					// Create new range wrapping changed link.
					writer.setSelection( linkRange );
				}
				// If not then insert text node with `linkHref` attribute in place of caret.
				// However, since selection in collapsed, attribute value will be used as data for text node.
				// So, if `href` is empty, do not create text node.
				else if ( attrs.href !== '' ) {
					const attributes = toMap( selection.getAttributes() );
					attributes.set( 'linkHref', attrs.href );

					const node = writer.createText( attrs.href, attributes );

					writer.insert( node, position );

					// Create new range wrapping created node.
					writer.setSelection( writer.createRangeOn( node ) );
				}
			} else {
				// If selection has non-collapsed ranges, we change attribute on nodes inside those ranges
				// omitting nodes where `linkHref` attribute is disallowed.
				const ranges = model.schema.getValidRanges( selection.getRanges(), 'linkHref' );
				for ( const range of ranges ) {
					writer.setAttribute( 'linkHref', attrs.href, range );
					writer.setAttribute( 'linkitAttrs', attrs, range );
				}
			}
		} );
	}
}
