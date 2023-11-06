import React, { useState } from 'react';
import './Modal.css';


function Modal({
	title, useFooter,
	children,
	onClose
}: {
	title: string,
	useFooter: boolean,
	children: React.JSX.Element,
	onClose: () => void
}) {

	return <div
		className="modal"
	>
		<div className='wrapper'>
			< div className="modal-header"
			>
				{title}
				<button
					onClick={
						() => onClose()
					}
					className="close"
				>
					close
				</button>
			</div>
			< div className="modal-body"
			>
				{children}
			</div>
			{useFooter && < div className="modal-footer"
			>
				modal-footer
			</div>
			}
		</div>

	</div >

}


export default Modal;